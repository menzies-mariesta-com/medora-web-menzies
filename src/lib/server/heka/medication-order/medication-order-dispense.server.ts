import { error } from '@sveltejs/kit';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { ensureDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { CategoryEnum, StatusEnum } from '$lib/model/enum/db-link';
import { addDeltaToInvStock } from '$lib/server/heka/inventory/item-batch.server';
import { computeSalePriceAtTransactionDb } from '$lib/server/heka/inventory/sale-price.server';
import {
	issueQtyStringFromPurchaseReceipt,
	purchaseQtyToIssueQtyString
} from '$lib/server/heka/inventory/item-unit-inventory.server';
import { parsePositiveIntQty } from '$lib/server/heka/inventory/inv-validate.server';
import { resolveItemUnitMastersByItemAndPurchaseUnit } from '$lib/server/heka/administration/item-master.server';

type Db = NeonDatabase<typeof schema>;

export const MEDICATION_ORDER_SUPPLY_CATEGORY_IDS = [
	CategoryEnum.PHARMACY_SUPPLY,
	CategoryEnum.MEDICAL_SUPPLY
] as const;

export type MedicationOrderLineAllocationInput = {
	batchId: number;
	qtyPurchase: string;
};

export type MedicationOrderLineSaveInput = {
	itemMasterId: number;
	dose: string;
	doseUnitId: number;
	frequencyId: number;
	durationValue: string;
	durationUnitId: number;
	formId: number | null;
	routeId: number | null;
	orderTypeId: number | null;
	foodRelationId: number | null;
	startAt: string;
	testDose: string | null;
	substituteNotAllowed: boolean;
	unitSalePrice: string;
	issueQtyPurchase: string;
	itemUnitMasterId: number;
	allocations: MedicationOrderLineAllocationInput[];
};

export function computeLineTotal(input: {
	issueQtyPurchase: string;
	unitSalePrice: string;
}): number {
	const q = Number(input.issueQtyPurchase);
	const p = Number(input.unitSalePrice);
	if (!Number.isFinite(q) || !Number.isFinite(p) || q < 0 || p < 0) {
		return 0;
	}
	return Math.round(q * p * 100) / 100;
}

export function computeBatchTotalFromLines(
	lines: MedicationOrderLineSaveInput[]
): string {
	let sum = 0;
	for (const ln of lines) {
		sum += computeLineTotal(ln);
	}
	return sum.toFixed(2);
}

async function getIumFactors(
	hospitalId: string,
	itemUnitMasterId: number
): Promise<{
	purchaseUnitId: number;
	purchaseConversionFactor: string;
	issueConversionFactor: string;
}> {
	const rows = await ensureDb()
		.select({
			purchaseUnitId: schema.itemUnitMasterTable.purchaseUnitId,
			purchaseConversionFactor:
				schema.itemUnitMasterTable.purchaseConversionFactor,
			issueConversionFactor:
				schema.itemUnitMasterTable.issueConversionFactor
		})
		.from(schema.itemUnitMasterTable)
		.where(
			and(
				eq(schema.itemUnitMasterTable.id, itemUnitMasterId),
				eq(schema.itemUnitMasterTable.hospitalId, hospitalId),
				isNull(schema.itemUnitMasterTable.deletedAt)
			)
		)
		.limit(1);
	const row = rows[0];
	if (!row) throw error(400, 'Invalid item unit master');
	return {
		purchaseUnitId: row.purchaseUnitId,
		purchaseConversionFactor: String(row.purchaseConversionFactor),
		issueConversionFactor: String(row.issueConversionFactor)
	};
}

export async function validateMedicationOrderLinesForDispense(input: {
	hospitalId: string;
	storeId: number;
	lines: MedicationOrderLineSaveInput[];
}): Promise<void> {
	const { hospitalId, storeId, lines } = input;
	if (!Array.isArray(lines) || lines.length === 0) {
		throw error(400, 'At least one line is required');
	}

	for (const ln of lines) {
		if (
			!Number.isFinite(ln.itemMasterId) ||
			ln.itemMasterId <= 0 ||
			!Number.isFinite(ln.itemUnitMasterId) ||
			ln.itemUnitMasterId <= 0
		) {
			throw error(400, 'Invalid item or unit on a line');
		}
		const allocs = ln.allocations ?? [];
		if (allocs.length === 0) {
			throw error(400, 'Each line needs at least one batch allocation');
		}

		const ium = await getIumFactors(hospitalId, ln.itemUnitMasterId);
		const iumMap = await resolveItemUnitMastersByItemAndPurchaseUnit(
			hospitalId,
			[{ itemId: ln.itemMasterId, purchaseUnitId: ium.purchaseUnitId }]
		);
		if (
			!iumMap.has(`${ln.itemMasterId}:${ium.purchaseUnitId}`)
		) {
			throw error(400, 'Item unit master does not match item');
		}

		let sumPurchase = 0;
		for (const a of allocs) {
			const qp = Number(a.qtyPurchase);
			if (!Number.isFinite(qp) || qp <= 0) {
				throw error(400, 'Allocation quantity must be positive');
			}
			sumPurchase += qp;

			const [batch] = await ensureDb()
				.select({
					id: schema.itemBatchTable.id,
					itemId: schema.itemBatchTable.itemId
				})
				.from(schema.itemBatchTable)
				.where(
					and(
						eq(schema.itemBatchTable.id, a.batchId),
						eq(schema.itemBatchTable.hospitalId, hospitalId)
					)
				)
				.limit(1);
			if (!batch || batch.itemId !== ln.itemMasterId) {
				throw error(400, 'Invalid batch for item on line');
			}

			const needIssue = purchaseQtyToIssueQtyString(
				a.qtyPurchase,
				ium.purchaseConversionFactor,
				ium.issueConversionFactor
			);
			const needN = parsePositiveIntQty(needIssue, 'quantity');

			const [stockRow] = await ensureDb()
				.select({ quantity: schema.invStockTable.quantity })
				.from(schema.invStockTable)
				.where(
					and(
						eq(schema.invStockTable.storeId, storeId),
						eq(schema.invStockTable.batchId, a.batchId),
						eq(schema.invStockTable.itemId, ln.itemMasterId),
						eq(schema.invStockTable.hospitalId, hospitalId),
						isNull(schema.invStockTable.deletedAt)
					)
				)
				.limit(1);
			const avail = stockRow ? Number(stockRow.quantity) : 0;
			if (avail + 1e-9 < needN) {
				throw error(400, 'Insufficient stock for a batch allocation');
			}
		}

		const issueFromAllocs = purchaseQtyToIssueQtyString(
			String(sumPurchase),
			ium.purchaseConversionFactor,
			ium.issueConversionFactor
		);
		const lineIssue = purchaseQtyToIssueQtyString(
			ln.issueQtyPurchase,
			ium.purchaseConversionFactor,
			ium.issueConversionFactor
		);
		if (issueFromAllocs !== lineIssue) {
			throw error(
				400,
				'Line quantity must match the sum of batch allocations'
			);
		}

		const price = Number(ln.unitSalePrice);
		if (!Number.isFinite(price) || price < 0) {
			throw error(400, 'Invalid unit sale price');
		}
	}
}

export async function applyStockForLineAllocations(
	tx: Db,
	input: {
		hospitalId: string;
		storeId: number;
		itemId: number;
		itemUnitMasterId: number;
		allocations: MedicationOrderLineAllocationInput[];
		userId: string | null;
	}
): Promise<void> {
	const ium = await getIumFactors(input.hospitalId, input.itemUnitMasterId);
	for (const a of input.allocations) {
		const qp = Number(a.qtyPurchase);
		if (!Number.isFinite(qp) || qp <= 0) continue;
		const needIssue = await issueQtyStringFromPurchaseReceipt({
			hospitalId: input.hospitalId,
			itemId: input.itemId,
			purchaseUnitId: ium.purchaseUnitId,
			purchaseQtyStr: a.qtyPurchase
		});
		const needN = parsePositiveIntQty(needIssue, 'quantity');
		await addDeltaToInvStock(tx, {
			hospitalId: input.hospitalId,
			itemId: input.itemId,
			storeId: input.storeId,
			batchId: a.batchId,
			delta: String(-needN),
			userId: input.userId
		});
	}
}

export async function reverseStockForBatch(
	tx: Db,
	input: {
		hospitalId: string;
		storeId: number;
		batchId: number;
		userId: string | null;
	}
): Promise<void> {
	const lines = await tx
		.select({
			id: schema.medicationOrderLineTable.id,
			itemMasterId: schema.medicationOrderLineTable.itemMasterId,
			itemUnitMasterId:
				schema.medicationOrderLineTable.itemUnitMasterId
		})
		.from(schema.medicationOrderLineTable)
		.where(
			and(
				eq(schema.medicationOrderLineTable.batchId, input.batchId),
				isNull(schema.medicationOrderLineTable.deletedAt)
			)
		);

	if (lines.length === 0) return;

	const lineIds = lines.map((l) => l.id);
	const allocs = await tx
		.select({
			lineId: schema.medicationOrderLineAllocationTable.lineId,
			batchId: schema.medicationOrderLineAllocationTable.batchId,
			qtyPurchase:
				schema.medicationOrderLineAllocationTable.qtyPurchase,
			itemUnitMasterId:
				schema.medicationOrderLineTable.itemUnitMasterId,
			itemMasterId: schema.medicationOrderLineTable.itemMasterId
		})
		.from(schema.medicationOrderLineAllocationTable)
		.innerJoin(
			schema.medicationOrderLineTable,
			eq(
				schema.medicationOrderLineAllocationTable.lineId,
				schema.medicationOrderLineTable.id
			)
		)
		.where(
			and(
				inArray(
					schema.medicationOrderLineAllocationTable.lineId,
					lineIds
				),
				isNull(schema.medicationOrderLineAllocationTable.deletedAt)
			)
		);

	for (const a of allocs) {
		if (a.itemUnitMasterId == null) continue;
		const ium = await getIumFactors(
			input.hospitalId,
			a.itemUnitMasterId
		);
		const needIssue = await issueQtyStringFromPurchaseReceipt({
			hospitalId: input.hospitalId,
			itemId: a.itemMasterId,
			purchaseUnitId: ium.purchaseUnitId,
			purchaseQtyStr: String(a.qtyPurchase)
		});
		const needN = parsePositiveIntQty(needIssue, 'quantity');
		await addDeltaToInvStock(tx, {
			hospitalId: input.hospitalId,
			itemId: a.itemMasterId,
			storeId: input.storeId,
			batchId: a.batchId,
			delta: String(needN),
			userId: input.userId
		});
	}

	const now = new Date().toISOString();
	await tx
		.update(schema.medicationOrderLineAllocationTable)
		.set({ deletedAt: now, deletedBy: input.userId })
		.where(
			and(
				inArray(
					schema.medicationOrderLineAllocationTable.lineId,
					lineIds
				),
				isNull(schema.medicationOrderLineAllocationTable.deletedAt)
			)
		);
}

export async function insertMedicationOrderLineWithAllocations(
	tx: Db,
	input: {
		hospitalId: string;
		storeId: number;
		batchId: number;
		lineNo: number;
		line: MedicationOrderLineSaveInput;
		userId: string | null;
	}
): Promise<number> {
	const { line } = input;
	const primaryAlloc =
		line.allocations.find((a) => Number(a.qtyPurchase) > 0) ??
		line.allocations[0];
	let unitSalePrice = line.unitSalePrice;
	if (primaryAlloc) {
		const computed = await computeSalePriceAtTransactionDb({
			hospitalId: input.hospitalId,
			batchId: primaryAlloc.batchId,
			itemId: line.itemMasterId,
			storeId: input.storeId,
			module: 'MO'
		});
		unitSalePrice = computed.unitSalePricePurchase;
	}

	const [inserted] = await tx
		.insert(schema.medicationOrderLineTable)
		.values({
			batchId: input.batchId,
			lineNo: input.lineNo,
			itemMasterId: line.itemMasterId,
			dose: line.dose,
			doseUnitId: line.doseUnitId,
			frequencyId: line.frequencyId,
			durationValue: line.durationValue,
			durationUnitId: line.durationUnitId,
			formId: line.formId,
			routeId: line.routeId,
			orderTypeId: line.orderTypeId,
			foodRelationId: line.foodRelationId,
			startAt: line.startAt,
			testDose: line.testDose,
			substituteNotAllowed: line.substituteNotAllowed,
			itemUnitMasterId: line.itemUnitMasterId,
			issueQtyPurchase: line.issueQtyPurchase,
			unitSalePrice,
			lineRemarks: null,
			createdBy: input.userId,
			updatedBy: input.userId
		})
		.returning({ id: schema.medicationOrderLineTable.id });
	if (!inserted) throw error(500, 'Failed to insert line');

	for (const a of line.allocations) {
		await tx.insert(schema.medicationOrderLineAllocationTable).values({
			lineId: inserted.id,
			batchId: a.batchId,
			qtyPurchase: a.qtyPurchase,
			createdBy: input.userId,
			updatedBy: input.userId
		});
	}

	await applyStockForLineAllocations(tx, {
		hospitalId: input.hospitalId,
		storeId: input.storeId,
		itemId: line.itemMasterId,
		itemUnitMasterId: line.itemUnitMasterId,
		allocations: line.allocations,
		userId: input.userId
	});

	return inserted.id;
}

export async function loadAllocationsForLineIds(lineIds: number[]) {
	if (lineIds.length === 0) return [];
	return await ensureDb()
		.select({
			lineId: schema.medicationOrderLineAllocationTable.lineId,
			batchId: schema.medicationOrderLineAllocationTable.batchId,
			qtyPurchase:
				schema.medicationOrderLineAllocationTable.qtyPurchase,
			batchNo: schema.itemBatchTable.batchNo,
			expiryDate: schema.itemBatchTable.expiryDate
		})
		.from(schema.medicationOrderLineAllocationTable)
		.innerJoin(
			schema.itemBatchTable,
			eq(
				schema.medicationOrderLineAllocationTable.batchId,
				schema.itemBatchTable.id
			)
		)
		.where(
			and(
				inArray(
					schema.medicationOrderLineAllocationTable.lineId,
					lineIds
				),
				isNull(schema.medicationOrderLineAllocationTable.deletedAt)
			)
		);
}

export async function assertBatchNotPaid(
	hospitalId: string,
	batchId: number
): Promise<void> {
	const [pay] = await ensureDb()
		.select({ id: schema.medicationOrderBatchPaymentTable.id })
		.from(schema.medicationOrderBatchPaymentTable)
		.where(
			and(
				eq(schema.medicationOrderBatchPaymentTable.batchId, batchId),
				eq(
					schema.medicationOrderBatchPaymentTable.hospitalId,
					hospitalId
				),
				isNull(schema.medicationOrderBatchPaymentTable.deletedAt)
			)
		)
		.limit(1);
	if (pay) {
		throw error(400, 'This order has been paid and cannot be changed');
	}
}

/** Item search for med order: pharmacy + medical supply in stock at store. */
export function buildMedOrderItemSearchCategoryFilter(
	im: typeof schema.itemMasterTable,
	pharmacyGenericId: number | null
) {
	return and(
		inArray(im.categoryId, [...MEDICATION_ORDER_SUPPLY_CATEGORY_IDS]),
		pharmacyGenericId != null
			? and(
					eq(im.categoryId, CategoryEnum.PHARMACY_SUPPLY),
					eq(im.pharmacyGenericId, pharmacyGenericId)
				)
			: undefined
	);
}
