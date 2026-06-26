import { error, type RequestEvent } from '@sveltejs/kit';
import {
	and,
	count,
	desc,
	eq,
	ilike,
	isNotNull,
	isNull,
	sql
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	InvGrnStatusTaggingEnum,
	InvPoStatusTaggingEnum
} from '$lib/model/enum/db-link';
import { normalizePagination } from '$lib/model/type/pagination.type';
import {
	assertStoreInHospital,
	ensureHospitalInventoryAccess,
	getStaffIdForUser
} from './inventory-scope.server';
import { postStoreTransfer } from './transfer.server';
import {
	assertStaffAssignedForModule,
	listAssignedStoreIdsForStaff
} from './approval-workflow.server';
import {
	parseMoney2dp,
	parseNonNegativeIntQty,
	parsePositiveIntQty
} from './inv-validate.server';
import { addDeltaToInvStock, findOrCreateItemBatch } from './item-batch.server';
import {
	issueQtyStringFromAnyUnit,
	issueQtyStringFromPurchaseReceipt,
	listItemUnitMastersForItem,
	resolveItemUnitMasterForItemPurchaseUnit
} from './item-unit-inventory.server';
import { computeLandedCostTotals } from '$lib/tool/inventory/grn-pricing.util';

function parseGrnOptionalQty(s: string | null | undefined): number {
	if (s == null || s === '') return 0;
	return parseNonNegativeIntQty(s, 'quantity');
}

function parseGrnMoney(s: string | null | undefined): number {
	if (s == null || s === '') return 0;
	return Number(parseMoney2dp(s, 'amount'));
}

function parseOptionalIumId(v: unknown): number | null {
	return typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;
}

type GrnInvoiceChargeInput = {
	invoiceDiscountAmount?: string | null;
	invoiceDiscountPercent?: string | null;
	invoiceTaxAmount?: string | null;
	invoiceTaxPercent?: string | null;
};

function grnInvoiceChargeDbValues(input: GrnInvoiceChargeInput) {
	const discAmt = parseGrnMoney(input.invoiceDiscountAmount);
	const discPct = parseGrnMoney(input.invoiceDiscountPercent);
	const taxAmt = parseGrnMoney(input.invoiceTaxAmount);
	const taxPct = parseGrnMoney(input.invoiceTaxPercent);
	return {
		invoiceDiscountAmount: discAmt.toFixed(2),
		invoiceDiscountPercent: discPct.toFixed(2),
		invoiceTaxAmount: taxAmt.toFixed(2),
		invoiceTaxPercent: taxPct.toFixed(2)
	};
}

/** Receiving store for a PO-backed GRN: the PO store (receiver). */
export async function getReceivingStoreForPurchaseOrder(
	event: RequestEvent,
	input: { hospitalId: string; poId: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const [po] = await ensureDb()
		.select()
		.from(table.purchaseOrderTable)
		.where(
			and(
				eq(table.purchaseOrderTable.id, input.poId),
				eq(table.purchaseOrderTable.hospitalId, input.hospitalId),
				isNull(table.purchaseOrderTable.deletedAt)
			)
		)
		.limit(1);
	if (!po) return null;
	const st = await assertStoreInHospital(
		input.hospitalId,
		po.storeId
	);
	if (!st.branchId) return null;
	return {
		storeId: st.id,
		storeName: st.storeName,
		branchId: st.branchId
	};
}

const PO_ALLOWS_GRN = new Set([
	InvPoStatusTaggingEnum.APPROVED,
	InvPoStatusTaggingEnum.SENT_TO_SUPPLIER,
	InvPoStatusTaggingEnum.PARTIALLY_RECEIVED
]);

export async function listGoodsReceiptNotes(
	event: RequestEvent,
	input: {
		hospitalId: string;
		page?: number;
		pageSize?: number;
		poId?: string;
		/** When set, only GRNs for this store (e.g. navbar-selected inventory / CPS receiving). */
		storeId?: number;
		statusTaggingId?: number;
		poNo?: string;
		invoiceNo?: string;
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const { page, pageSize, limit, offset } =
		normalizePagination(input);

	let cond = and(
		eq(table.goodsReceiptNoteTable.hospitalId, input.hospitalId),
		isNull(table.goodsReceiptNoteTable.deletedAt)
	);
	if (input.poId) {
		cond = and(
			cond,
			eq(table.goodsReceiptNoteTable.poId, input.poId)
		)!;
	}
	if (input.storeId != null) {
		cond = and(
			cond,
			eq(table.goodsReceiptNoteTable.storeId, input.storeId)
		)!;
	}
	if (typeof input.statusTaggingId === 'number') {
		cond = and(
			cond,
			eq(
				table.goodsReceiptNoteTable.statusTaggingId,
				input.statusTaggingId
			)
		)!;
	}
	const invoiceNoTerm = input.invoiceNo?.trim();
	if (invoiceNoTerm) {
		const safe = invoiceNoTerm.replace(/[%_\\]/g, '');
		if (safe) {
			cond = and(
				cond,
				ilike(table.goodsReceiptNoteTable.invoiceNo, `%${safe}%`)
			)!;
		}
	}
	const poNoTerm = input.poNo?.trim();
	if (poNoTerm) {
		const safe = poNoTerm.replace(/[%_\\]/g, '');
		if (safe) {
			const pattern = `%${safe}%`;
			cond = and(
				cond,
				isNotNull(table.goodsReceiptNoteTable.poId),
				sql`exists (select 1 from purchase_order po where po.id = ${table.goodsReceiptNoteTable.poId} and coalesce(po.po_no, '') ilike ${pattern})`
			)!;
		}
	}

	const uCreated = alias(table.userTable, 'grn_created_by_user');
	const uUpdated = alias(table.userTable, 'grn_updated_by_user');
	const uReceived = alias(table.userTable, 'grn_received_by_user');
	const uCancelled = alias(table.userTable, 'grn_cancelled_by_user');
	const grnXfer = alias(table.invStoreTransferTable, 'grn_list_xfer');

	const [data, cntRow] = await Promise.all([
		ensureDb()
			.select({
				grn: table.goodsReceiptNoteTable,
				storeName: table.storeTable.storeName,
				statusName: table.statusTaggingTable.name,
				supplierName: table.supplierTable.name,
				poPrId: table.purchaseOrderTable.prId,
				poNo: table.purchaseOrderTable.poNo,
				sourceXferId: grnXfer.id,
				createdByName: uCreated.name,
				updatedByName: uUpdated.name,
				receivedByName: uReceived.name,
				cancelledByName: uCancelled.name
			})
			.from(table.goodsReceiptNoteTable)
			.innerJoin(
				table.storeTable,
				eq(table.goodsReceiptNoteTable.storeId, table.storeTable.id)
			)
			.innerJoin(
				table.statusTaggingTable,
				eq(
					table.goodsReceiptNoteTable.statusTaggingId,
					table.statusTaggingTable.id
				)
			)
			.leftJoin(
				table.purchaseOrderTable,
				eq(
					table.goodsReceiptNoteTable.poId,
					table.purchaseOrderTable.id
				)
			)
			.leftJoin(
				grnXfer,
				and(
					eq(grnXfer.sourceGrnId, table.goodsReceiptNoteTable.id),
					isNull(grnXfer.deletedAt)
				)
			)
			.innerJoin(
				table.supplierTable,
				sql`${table.supplierTable.id} = coalesce(${table.purchaseOrderTable.supplierId}, ${table.goodsReceiptNoteTable.supplierId})`
			)
			.leftJoin(
				uCreated,
				eq(table.goodsReceiptNoteTable.createdBy, uCreated.id)
			)
			.leftJoin(
				uUpdated,
				eq(table.goodsReceiptNoteTable.updatedBy, uUpdated.id)
			)
			.leftJoin(
				uReceived,
				eq(table.goodsReceiptNoteTable.receivedBy, uReceived.id)
			)
			.leftJoin(
				uCancelled,
				eq(table.goodsReceiptNoteTable.cancelledBy, uCancelled.id)
			)
			.where(cond)
			.orderBy(desc(table.goodsReceiptNoteTable.createdAt))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ c: count() })
			.from(table.goodsReceiptNoteTable)
			.where(cond)
	]);

	const total = cntRow[0]?.c ?? 0;
	return {
		data: data.map((r) => ({
			...r.grn,
			storeName: r.storeName,
			statusName: r.statusName,
			supplierName: r.supplierName,
			createdByName: r.createdByName ?? null,
			updatedByName: r.updatedByName ?? null,
			receivedByName: r.receivedByName ?? null,
			cancelledByName: r.cancelledByName ?? null,
			poPrId: r.poPrId ?? null,
			poNo: r.poNo ?? null,
			grnTransferDone: r.sourceXferId != null
		})),
		total,
		page,
		pageSize,
		totalPages: Math.ceil(Number(total) / pageSize) || 1
	};
}

export async function canCurrentStaffPostGrn(
	event: RequestEvent,
	input: { hospitalId: string; storeId: number }
): Promise<boolean> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id ?? null;
	const staffId = userId ? await getStaffIdForUser(userId) : null;
	if (!staffId) return false;
	const stores = await listAssignedStoreIdsForStaff(
		input.hospitalId,
		'GRN',
		staffId
	);
	return stores.includes(input.storeId);
}

export async function getGoodsReceiptNoteById(
	event: RequestEvent,
	input: { hospitalId: string; id: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const uReceived = alias(
		table.userTable,
		'grn_detail_received_by_user'
	);
	const freeUnitTable = alias(table.unitTable, 'grn_detail_free_unit');
	const [row] = await ensureDb()
		.select({
			grn: table.goodsReceiptNoteTable,
			storeName: table.storeTable.storeName,
			statusName: table.statusTaggingTable.name,
			supplierName: table.supplierTable.name,
			poNo: table.purchaseOrderTable.poNo,
			poPrId: table.purchaseOrderTable.prId,
			receivedByName: uReceived.name
		})
		.from(table.goodsReceiptNoteTable)
		.innerJoin(
			table.storeTable,
			eq(table.goodsReceiptNoteTable.storeId, table.storeTable.id)
		)
		.innerJoin(
			table.statusTaggingTable,
			eq(
				table.goodsReceiptNoteTable.statusTaggingId,
				table.statusTaggingTable.id
			)
		)
		.innerJoin(
			table.supplierTable,
			eq(
				table.goodsReceiptNoteTable.supplierId,
				table.supplierTable.id
			)
		)
		.leftJoin(
			table.purchaseOrderTable,
			eq(
				table.goodsReceiptNoteTable.poId,
				table.purchaseOrderTable.id
			)
		)
		.leftJoin(
			uReceived,
			eq(table.goodsReceiptNoteTable.receivedBy, uReceived.id)
		)
		.where(
			and(
				eq(table.goodsReceiptNoteTable.id, input.id),
				eq(table.goodsReceiptNoteTable.hospitalId, input.hospitalId),
				isNull(table.goodsReceiptNoteTable.deletedAt)
			)
		)
		.limit(1);
	if (!row) return null;

	const lines = await ensureDb()
		.select({
			line: table.goodsReceiptLineTable,
			itemName: table.itemMasterTable.itemName,
			unitName: table.unitTable.name,
			freeUnitName: freeUnitTable.name
		})
		.from(table.goodsReceiptLineTable)
		.innerJoin(
			table.itemMasterTable,
			eq(table.goodsReceiptLineTable.itemId, table.itemMasterTable.id)
		)
		.innerJoin(
			table.unitTable,
			eq(table.goodsReceiptLineTable.unitId, table.unitTable.id)
		)
		.leftJoin(
			freeUnitTable,
			eq(
				table.goodsReceiptLineTable.freeUnitId,
				freeUnitTable.id
			)
		)
		.where(
			and(
				eq(table.goodsReceiptLineTable.grnId, input.id),
				isNull(table.goodsReceiptLineTable.deletedAt)
			)
		);

	return {
		...row.grn,
		storeName: row.storeName,
		statusName: row.statusName,
		supplierName: row.supplierName,
		poNo: row.poNo ?? null,
		poPrId: row.poPrId ?? null,
		receivedByName: row.receivedByName ?? null,
		lines: lines.map((r) => ({
			...r.line,
			itemName: r.itemName ?? null,
			unitName: r.unitName ?? null,
			freeUnitName: r.freeUnitName ?? null
		}))
	};
}

export async function createAndPostGoodsReceipt(
	event: RequestEvent,
	input: {
		hospitalId: string;
		poId: string;
		storeId: number;
		receivedDate: string;
		invoiceNo?: string | null;
		invoiceDate?: string | null;
		invoiceAmount?: string | null;
		invoicePhotoUrl?: string | null;
		invoiceDiscountAmount?: string | null;
		invoiceDiscountPercent?: string | null;
		invoiceTaxAmount?: string | null;
		invoiceTaxPercent?: string | null;
		/** Optional override; defaults to current user. */
		receivedBy?: string | null;
		lines: {
			poLineId: number;
			purchasedQty: string;
			batchNo?: string | null;
			expiryDate?: string | null;
			/** Unit purchase price at receipt (batch/expiry required for all items). */
			purchasePrice?: string | null;
			freeQty?: string | null;
			freeUnitId?: number | null;
			/** Item unit master row id for free-qty conversion (from UI picker). */
			freeUnitIumId?: number | null;
			discountAmount?: string | null;
			discountPercent?: string | null;
			taxAmount?: string | null;
			taxPercent?: string | null;
		}[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	const staffId = await getStaffIdForUser(userId);
	if (!staffId) throw error(403, 'Staff account required');
	await assertStaffAssignedForModule(
		input.hospitalId,
		input.storeId,
		'GRN',
		staffId
	);
	if (input.lines.length === 0)
		throw error(400, 'At least one line required');

	const store = await assertStoreInHospital(
		input.hospitalId,
		input.storeId
	);
	if (!store.branchId) {
		throw error(400, 'Store is missing branch context');
	}

	const [po] = await ensureDb()
		.select()
		.from(table.purchaseOrderTable)
		.where(
			and(
				eq(table.purchaseOrderTable.id, input.poId),
				eq(table.purchaseOrderTable.hospitalId, input.hospitalId),
				isNull(table.purchaseOrderTable.deletedAt)
			)
		)
		.limit(1);
	if (!po) throw error(404, 'PO not found');
	if (!PO_ALLOWS_GRN.has(po.statusTaggingId)) {
		throw error(400, 'PO status does not allow goods receipt');
	}

	if (po.prId) {
		const [pr] = await ensureDb()
			.select()
			.from(table.purchaseRequisitionTable)
			.where(
				and(
					eq(table.purchaseRequisitionTable.id, po.prId),
					eq(
						table.purchaseRequisitionTable.hospitalId,
						input.hospitalId
					),
					isNull(table.purchaseRequisitionTable.deletedAt)
				)
			)
			.limit(1);
		if (!pr) throw error(404, 'Purchase requisition not found');
		// PR-backed GRN must be posted into the PR destination store (receiver).
		if (input.storeId !== pr.toStoreId) {
			throw error(
				400,
				'Goods must be received into the PR destination store'
			);
		}
	} else if (input.storeId !== po.storeId) {
		throw error(
			400,
			'Goods must be received into the same store as the purchase order (manual PO)'
		);
	}

	const grnId = await ensureDb().transaction(async (tx) => {
		const receivedByUserId = input.receivedBy?.trim()
			? input.receivedBy.trim()
			: userId;
		if (receivedByUserId !== userId) {
			const [u] = await tx
				.select({ id: table.userTable.id })
				.from(table.userTable)
				.where(eq(table.userTable.id, receivedByUserId))
				.limit(1);
			if (!u) throw error(400, 'Invalid receivedBy');
		}

		const invoiceCharges = grnInvoiceChargeDbValues(input);

		const [grn] = await tx
			.insert(table.goodsReceiptNoteTable)
			.values({
				hospitalId: input.hospitalId,
				poId: input.poId,
				supplierId: po.supplierId,
				storeId: input.storeId,
				invoiceNo: input.invoiceNo?.trim() || null,
				invoiceDate: input.invoiceDate?.trim() || null,
				invoiceAmount: input.invoiceAmount?.trim() || null,
				...invoiceCharges,
				invoicePhotoUrl: input.invoicePhotoUrl?.trim() || null,
				receivedBy: receivedByUserId,
				receivedDate: input.receivedDate,
				statusTaggingId: InvGrnStatusTaggingEnum.POSTED,
				createdBy: userId,
				updatedBy: userId
			})
			.returning({ id: table.goodsReceiptNoteTable.id });
		if (!grn) throw error(500, 'GRN insert failed');

		for (const ln of input.lines) {
			const [poLine] = await tx
				.select()
				.from(table.purchaseOrderLineTable)
				.where(
					and(
						eq(table.purchaseOrderLineTable.id, ln.poLineId),
						eq(table.purchaseOrderLineTable.poId, input.poId),
						isNull(table.purchaseOrderLineTable.deletedAt)
					)
				)
				.limit(1);
			if (!poLine) throw error(400, `Invalid PO line ${ln.poLineId}`);
			const recv = parsePositiveIntQty(ln.purchasedQty, 'purchasedQty');
			const prev = Number(poLine.qtyReceivedCumulative);
			const ordered = Number(poLine.quantity);
			if (prev + recv > ordered + 1e-9) {
				throw error(
					400,
					'Purchased quantity exceeds ordered quantity'
				);
			}

			const [im] = await tx
				.select({ id: table.itemMasterTable.id })
				.from(table.itemMasterTable)
				.where(eq(table.itemMasterTable.id, poLine.itemId))
				.limit(1);
			if (!im) throw error(400, 'Item not found');

			let batchNo: string;
			let expiryDate: string | null;
			let purchasePriceStr: string;
			const bn = ln.batchNo?.trim();
			if (!bn) throw error(400, 'batch_no required for this item');
			if (!ln.expiryDate)
				throw error(400, 'expiry_date required for this item');
			const pp = ln.purchasePrice?.trim();
			if (!pp || Number(parseMoney2dp(pp, 'purchasePrice')) <= 0) {
				throw error(400, 'purchase_price required');
			}
			batchNo = bn;
			expiryDate = ln.expiryDate;
			purchasePriceStr = parseMoney2dp(pp, 'purchasePrice');

			const freeQ = parseGrnOptionalQty(ln.freeQty);
			const freeUnitIdRaw =
				typeof ln.freeUnitId === 'number' &&
				Number.isInteger(ln.freeUnitId)
					? ln.freeUnitId
					: null;
			const { ium } = await resolveItemUnitMasterForItemPurchaseUnit({
				hospitalId: input.hospitalId,
				itemId: poLine.itemId,
				purchaseUnitId: poLine.unitId
			});
			const freeUnitId = freeUnitIdRaw ?? poLine.unitId;
			const freeUnitIumId = parseOptionalIumId(ln.freeUnitIumId);
			const allIums = await listItemUnitMastersForItem({
				hospitalId: input.hospitalId,
				itemId: poLine.itemId
			});
			const discAmt = parseGrnMoney(ln.discountAmount);
			const discPct = parseGrnMoney(ln.discountPercent);
			const taxAmt = parseGrnMoney(ln.taxAmount);
			const taxPct = parseGrnMoney(ln.taxPercent);
			const landed = computeLandedCostTotals({
				purchasedQty: recv,
				purchaseUnitPrice: Number(purchasePriceStr),
				discountAmount: discAmt,
				discountPercent: discPct,
				taxAmount: taxAmt,
				taxPercent: taxPct
			});

			const [grnLine] = await tx
				.insert(table.goodsReceiptLineTable)
				.values({
					grnId: grn.id,
					poLineId: ln.poLineId,
					itemId: poLine.itemId,
					purchasedQty: ln.purchasedQty,
					batchNo,
					expiryDate,
					batchId: null,
					purchasePrice: purchasePriceStr,
					unitId: poLine.unitId,
					freeQty: String(freeQ),
					freeUnitId,
					discountAmount: landed.discountTotal.toFixed(2),
					discountPercent: Number(discPct).toFixed(2),
					taxAmount: landed.taxTotal.toFixed(2),
					taxPercent: Number(taxPct).toFixed(2),
					createdBy: userId,
					updatedBy: userId
				})
				.returning({ id: table.goodsReceiptLineTable.id });
			if (!grnLine) throw error(500, 'GRN line failed');

			const batchId = await findOrCreateItemBatch(tx, {
				hospitalId: input.hospitalId,
				itemId: poLine.itemId,
				batchNo,
				expiryDate,
				supplierId: po.supplierId,
				goodsReceiptNoteId: grn.id,
				goodsReceiptLineId: grnLine.id
			});

			await tx
				.update(table.goodsReceiptLineTable)
				.set({ batchId })
				.where(eq(table.goodsReceiptLineTable.id, grnLine.id));

			const issueDeltaReceived =
				await issueQtyStringFromPurchaseReceipt({
					hospitalId: input.hospitalId,
					itemId: poLine.itemId,
					purchaseUnitId: poLine.unitId,
					purchaseQtyStr: ln.purchasedQty
				});
			const issueDeltaFree = issueQtyStringFromAnyUnit({
				qty: freeQ,
				unitId: freeUnitId,
				linePurchaseUnitId: poLine.unitId,
				lineIssueUnitId: ium.issueUnitId,
				lineIum: ium,
				allIums,
				preferredIumId: freeUnitIumId
			});
			const issueDeltaTotal =
				parsePositiveIntQty(issueDeltaReceived, 'issueQty') +
				parseNonNegativeIntQty(issueDeltaFree, 'freeIssueQty');

			await addDeltaToInvStock(tx, {
				hospitalId: input.hospitalId,
				itemId: poLine.itemId,
				storeId: input.storeId,
				batchId,
				delta: String(issueDeltaTotal),
				userId
			});

			const newCum = prev + recv;
			await tx
				.update(table.purchaseOrderLineTable)
				.set({
					qtyReceivedCumulative: String(newCum),
					updatedBy: userId
				})
				.where(eq(table.purchaseOrderLineTable.id, ln.poLineId));
		}

		const poLines = await tx
			.select()
			.from(table.purchaseOrderLineTable)
			.where(
				and(
					eq(table.purchaseOrderLineTable.poId, input.poId),
					isNull(table.purchaseOrderLineTable.deletedAt)
				)
			);

		let allClosed = true;
		for (const pl of poLines) {
			if (
				Number(pl.qtyReceivedCumulative) <
				Number(pl.quantity) - 1e-9
			) {
				allClosed = false;
				break;
			}
		}

		await tx
			.update(table.purchaseOrderTable)
			.set({
				statusTaggingId: allClosed
					? InvPoStatusTaggingEnum.CLOSED
					: InvPoStatusTaggingEnum.PARTIALLY_RECEIVED,
				updatedBy: userId
			})
			.where(eq(table.purchaseOrderTable.id, input.poId));

		return grn.id;
	});

	return getGoodsReceiptNoteById(event, {
		hospitalId: input.hospitalId,
		id: grnId
	});
}

export async function createAndPostDirectGoodsReceipt(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId: number;
		supplierId: number;
		receivedDate: string;
		invoiceNo?: string | null;
		invoiceDate?: string | null;
		invoiceAmount?: string | null;
		invoicePhotoUrl?: string | null;
		invoiceDiscountAmount?: string | null;
		invoiceDiscountPercent?: string | null;
		invoiceTaxAmount?: string | null;
		invoiceTaxPercent?: string | null;
		/** Optional override; defaults to current user. */
		receivedBy?: string | null;
		lines: {
			itemId: number;
			purchasedQty: string;
			unitId: number;
			batchNo?: string | null;
			expiryDate?: string | null;
			purchasePrice?: string | null;
			freeQty?: string | null;
			freeUnitId?: number | null;
			/** Item unit master row id for free-qty conversion (from UI picker). */
			freeUnitIumId?: number | null;
			discountAmount?: string | null;
			discountPercent?: string | null;
			taxAmount?: string | null;
			taxPercent?: string | null;
		}[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	const staffId = await getStaffIdForUser(userId);
	if (!staffId) throw error(403, 'Staff account required');
	await assertStaffAssignedForModule(
		input.hospitalId,
		input.storeId,
		'GRN',
		staffId
	);
	if (input.lines.length === 0)
		throw error(400, 'At least one line required');

	const store = await assertStoreInHospital(
		input.hospitalId,
		input.storeId
	);
	if (!store.branchId) {
		throw error(400, 'Store is missing branch context');
	}

	const grnId = await ensureDb().transaction(async (tx) => {
		const receivedByUserId = input.receivedBy?.trim()
			? input.receivedBy.trim()
			: userId;
		if (receivedByUserId !== userId) {
			const [u] = await tx
				.select({ id: table.userTable.id })
				.from(table.userTable)
				.where(eq(table.userTable.id, receivedByUserId))
				.limit(1);
			if (!u) throw error(400, 'Invalid receivedBy');
		}

		const invoiceCharges = grnInvoiceChargeDbValues(input);

		const [grn] = await tx
			.insert(table.goodsReceiptNoteTable)
			.values({
				hospitalId: input.hospitalId,
				poId: null,
				supplierId: input.supplierId,
				storeId: input.storeId,
				invoiceNo: input.invoiceNo?.trim() || null,
				invoiceDate: input.invoiceDate?.trim() || null,
				invoiceAmount: input.invoiceAmount?.trim() || null,
				...invoiceCharges,
				invoicePhotoUrl: input.invoicePhotoUrl?.trim() || null,
				receivedBy: receivedByUserId,
				receivedDate: input.receivedDate,
				statusTaggingId: InvGrnStatusTaggingEnum.POSTED,
				createdBy: userId,
				updatedBy: userId
			})
			.returning({ id: table.goodsReceiptNoteTable.id });
		if (!grn) throw error(500, 'GRN insert failed');

		for (const ln of input.lines) {
			const recv = Number(ln.purchasedQty);
			if (!Number.isFinite(recv) || recv <= 0) {
				throw error(400, 'Invalid purchased quantity');
			}
			const [im] = await tx
				.select({ id: table.itemMasterTable.id })
				.from(table.itemMasterTable)
				.where(eq(table.itemMasterTable.id, ln.itemId))
				.limit(1);
			if (!im) throw error(400, 'Item not found');

			let batchNo: string;
			let expiryDate: string | null;
			let purchasePriceStr: string;
			const bn = ln.batchNo?.trim();
			if (!bn) throw error(400, 'batch_no required for this item');
			if (!ln.expiryDate) {
				throw error(400, 'expiry_date required for this item');
			}
			const pp = ln.purchasePrice?.trim();
			if (!pp || Number(parseMoney2dp(pp, 'purchasePrice')) <= 0) {
				throw error(400, 'purchase_price required');
			}
			batchNo = bn;
			expiryDate = ln.expiryDate;
			purchasePriceStr = parseMoney2dp(pp, 'purchasePrice');

			const freeQ = parseGrnOptionalQty(ln.freeQty);
			const freeUnitIdRaw =
				typeof ln.freeUnitId === 'number' &&
				Number.isInteger(ln.freeUnitId)
					? ln.freeUnitId
					: null;
			const { ium } = await resolveItemUnitMasterForItemPurchaseUnit({
				hospitalId: input.hospitalId,
				itemId: ln.itemId,
				purchaseUnitId: ln.unitId
			});
			const freeUnitId = freeUnitIdRaw ?? ln.unitId;
			const freeUnitIumId = parseOptionalIumId(ln.freeUnitIumId);
			const allIums = await listItemUnitMastersForItem({
				hospitalId: input.hospitalId,
				itemId: ln.itemId
			});
			const discAmt = parseGrnMoney(ln.discountAmount);
			const discPct = parseGrnMoney(ln.discountPercent);
			const taxAmt = parseGrnMoney(ln.taxAmount);
			const taxPct = parseGrnMoney(ln.taxPercent);
			const landed = computeLandedCostTotals({
				purchasedQty: recv,
				purchaseUnitPrice: Number(purchasePriceStr),
				discountAmount: discAmt,
				discountPercent: discPct,
				taxAmount: taxAmt,
				taxPercent: taxPct
			});

			const [grnLine] = await tx
				.insert(table.goodsReceiptLineTable)
				.values({
					grnId: grn.id,
					poLineId: null,
					itemId: ln.itemId,
					purchasedQty: ln.purchasedQty,
					batchNo,
					expiryDate,
					batchId: null,
					purchasePrice: purchasePriceStr,
					unitId: ln.unitId,
					freeQty: String(freeQ),
					freeUnitId,
					discountAmount: landed.discountTotal.toFixed(2),
					discountPercent: Number(discPct).toFixed(2),
					taxAmount: landed.taxTotal.toFixed(2),
					taxPercent: Number(taxPct).toFixed(2),
					createdBy: userId,
					updatedBy: userId
				})
				.returning({ id: table.goodsReceiptLineTable.id });
			if (!grnLine) throw error(500, 'GRN line failed');

			const batchId = await findOrCreateItemBatch(tx, {
				hospitalId: input.hospitalId,
				itemId: ln.itemId,
				batchNo,
				expiryDate,
				supplierId: input.supplierId,
				goodsReceiptNoteId: grn.id,
				goodsReceiptLineId: grnLine.id
			});

			await tx
				.update(table.goodsReceiptLineTable)
				.set({ batchId })
				.where(eq(table.goodsReceiptLineTable.id, grnLine.id));

			const issueDeltaReceived =
				await issueQtyStringFromPurchaseReceipt({
					hospitalId: input.hospitalId,
					itemId: ln.itemId,
					purchaseUnitId: ln.unitId,
					purchaseQtyStr: ln.purchasedQty
				});
			const issueDeltaFree = issueQtyStringFromAnyUnit({
				qty: freeQ,
				unitId: freeUnitId,
				linePurchaseUnitId: ln.unitId,
				lineIssueUnitId: ium.issueUnitId,
				lineIum: ium,
				allIums,
				preferredIumId: freeUnitIumId
			});
			const issueDeltaTotal =
				parsePositiveIntQty(issueDeltaReceived, 'issueQty') +
				parseNonNegativeIntQty(issueDeltaFree, 'freeIssueQty');

			await addDeltaToInvStock(tx, {
				hospitalId: input.hospitalId,
				itemId: ln.itemId,
				storeId: input.storeId,
				batchId,
				delta: String(issueDeltaTotal),
				userId
			});
		}

		return grn.id;
	});

	return getGoodsReceiptNoteById(event, {
		hospitalId: input.hospitalId,
		id: grnId
	});
}

/** Move received stock from PR receiver store to the PR requesting store (batch-wise). */
export async function transferGrnToRequestingStore(
	event: RequestEvent,
	input: { hospitalId: string; grnId: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	const staffId = await getStaffIdForUser(userId);
	if (!staffId) throw error(403, 'Staff account required');

	const grn = await getGoodsReceiptNoteById(event, {
		hospitalId: input.hospitalId,
		id: input.grnId
	});
	if (!grn) throw error(404, 'Goods receipt not found');
	if (!grn.poId) {
		throw error(
			400,
			'Only PO-based goods receipts can be transferred to the requesting store'
		);
	}
	const [po] = await ensureDb()
		.select()
		.from(table.purchaseOrderTable)
		.where(
			and(
				eq(table.purchaseOrderTable.id, grn.poId),
				eq(table.purchaseOrderTable.hospitalId, input.hospitalId),
				isNull(table.purchaseOrderTable.deletedAt)
			)
		)
		.limit(1);
	if (!po) throw error(404, 'Purchase order not found');
	if (!po.prId) {
		throw error(
			400,
			'Purchase order must be linked to a purchase requisition'
		);
	}
	const [pr] = await ensureDb()
		.select()
		.from(table.purchaseRequisitionTable)
		.where(
			and(
				eq(table.purchaseRequisitionTable.id, po.prId),
				eq(
					table.purchaseRequisitionTable.hospitalId,
					input.hospitalId
				),
				isNull(table.purchaseRequisitionTable.deletedAt)
			)
		)
		.limit(1);
	if (!pr) throw error(404, 'Purchase requisition not found');

	// Permission: only GRN-post assignees for this store may transfer.
	await assertStaffAssignedForModule(
		input.hospitalId,
		grn.storeId,
		'GRN',
		staffId
	);

	// Ensure the GRN was posted into the PR destination store.
	if (grn.storeId !== pr.toStoreId) {
		throw error(
			400,
			'Goods receipt store does not match PR destination store'
		);
	}

	const lines = grn.lines;
	if (lines.length === 0) throw error(400, 'No lines to transfer');

	const xferLines: {
		itemId: number;
		batchId: number;
		quantity: string;
		unitId: number;
	}[] = [];
	for (const line of lines) {
		if (line.batchId == null) continue;
		const { ium } = await resolveItemUnitMasterForItemPurchaseUnit({
			hospitalId: input.hospitalId,
			itemId: line.itemId,
			purchaseUnitId: line.unitId
		});
		const qtyReceived = await issueQtyStringFromPurchaseReceipt({
			hospitalId: input.hospitalId,
			itemId: line.itemId,
			purchaseUnitId: line.unitId,
			purchaseQtyStr: String(line.purchasedQty)
		});
		const recvIssue = parsePositiveIntQty(qtyReceived, 'issueQty');
		if (recvIssue <= 0) continue;
		xferLines.push({
			itemId: line.itemId,
			batchId: line.batchId,
			quantity: String(recvIssue),
			unitId: ium.issueUnitId
		});
	}
	if (xferLines.length === 0) {
		throw error(400, 'No stock lines to transfer');
	}
	if (grn.storeId === pr.fromStoreId) {
		throw error(400, 'Requesting store matches receiving store');
	}

	const [existingXfer] = await ensureDb()
		.select({ id: table.invStoreTransferTable.id })
		.from(table.invStoreTransferTable)
		.where(
			and(
				eq(table.invStoreTransferTable.sourceGrnId, input.grnId),
				isNull(table.invStoreTransferTable.deletedAt)
			)
		)
		.limit(1);
	if (existingXfer) {
		throw error(
			400,
			'This goods receipt was already transferred to the requesting store'
		);
	}

	await postStoreTransfer(event, {
		hospitalId: input.hospitalId,
		fromStoreId: grn.storeId,
		toStoreId: pr.fromStoreId,
		remark: `From GRN ${input.grnId.slice(0, 8)}`,
		sourceGrnId: input.grnId,
		lines: xferLines
	});
	return { ok: true as const };
}

export async function searchGrnReceivedByUsers(
	event: RequestEvent,
	input: { hospitalId: string; q: string; limit?: number }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const q = input.q.trim();
	if (!q) return [];
	const limit = Math.max(
		1,
		Math.min(50, Number(input.limit ?? 20) || 20)
	);
	return ensureDb()
		.select({
			userId: table.userTable.id,
			name: table.userTable.name
		})
		.from(table.staffHospitalTable)
		.innerJoin(
			table.staffTable,
			eq(table.staffHospitalTable.staffId, table.staffTable.id)
		)
		.innerJoin(
			table.userTable,
			eq(table.staffTable.userId, table.userTable.id)
		)
		.where(
			and(
				eq(table.staffHospitalTable.hospitalId, input.hospitalId),
				ilike(table.userTable.name, `%${q}%`)
			)
		)
		.orderBy(table.userTable.name)
		.limit(limit);
}

/** Resolve label for a user who may appear as GRN "received by" (staff linked to this hospital). */
export async function lookupGrnReceivedByUserForHospital(
	event: RequestEvent,
	input: { hospitalId: string; userId: string }
): Promise<{ userId: string; name: string | null } | null> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const uid = input.userId.trim();
	if (!uid) return null;
	const [row] = await ensureDb()
		.select({
			userId: table.userTable.id,
			name: table.userTable.name
		})
		.from(table.staffHospitalTable)
		.innerJoin(
			table.staffTable,
			eq(table.staffHospitalTable.staffId, table.staffTable.id)
		)
		.innerJoin(
			table.userTable,
			eq(table.staffTable.userId, table.userTable.id)
		)
		.where(
			and(
				eq(table.staffHospitalTable.hospitalId, input.hospitalId),
				eq(table.userTable.id, uid)
			)
		)
		.limit(1);
	return row ?? null;
}
