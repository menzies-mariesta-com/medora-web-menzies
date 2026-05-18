import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { generatePrefix } from '$lib/server/heka/prefix/prefix-generator.server';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import {
	computeBatchTotalFromLines,
	computeLineTotal,
	type MedicationOrderLineSaveInput
} from './medication-order-dispense.server';
import { getFinancialYearIdToday } from './medication-order-internal.server';

export type MedicationOrderCheckoutResult = {
	receiptNo: string;
	amountDue: string;
	amountPaid: string;
	paymentMethod: string;
	paidAt: string;
	batch: {
		id: number;
		batchNo: string;
		extCustomerName: string | null;
		advisingDoctor: string | null;
		storeId: number;
	};
	lines: Array<{
		itemName: string | null;
		issueQtyPurchase: string;
		unitSalePrice: string;
		lineTotal: string;
		lineRemarks: string | null;
	}>;
};

export async function checkoutMedicationOrderBatchExternal(
	event: RequestEvent,
	input: {
		hospitalId: string;
		batchId: number;
		paymentMethod: string;
		amountPaid: string;
	}
): Promise<MedicationOrderCheckoutResult> {
	const { hospitalId, batchId } = input;
	const paymentMethod = input.paymentMethod.trim() || 'cash';
	const amountPaid = input.amountPaid.trim();
	await ensureCanAccessHospital(event, hospitalId);

	if (!amountPaid || !Number.isFinite(Number(amountPaid))) {
		throw error(400, 'amountPaid is required');
	}

	const db = ensureDb();
	const [batch] = await db
		.select()
		.from(table.medicationOrderBatchTable)
		.where(
			and(
				eq(table.medicationOrderBatchTable.id, batchId),
				eq(table.medicationOrderBatchTable.hospitalId, hospitalId),
				isNull(table.medicationOrderBatchTable.deletedAt)
			)
		)
		.limit(1);
	if (!batch) throw error(404, 'Batch not found');
	if (batch.visitId != null) {
		throw error(400, 'Checkout is only for external walk-in sales');
	}

	const [existingPay] = await db
		.select()
		.from(table.medicationOrderBatchPaymentTable)
		.where(
			and(
				eq(table.medicationOrderBatchPaymentTable.batchId, batchId),
				isNull(table.medicationOrderBatchPaymentTable.deletedAt)
			)
		)
		.limit(1);
	if (existingPay) {
		throw error(400, 'This order has already been paid');
	}

	const lines = await db
		.select({
			line: table.medicationOrderLineTable,
			itemName: table.itemMasterTable.itemName
		})
		.from(table.medicationOrderLineTable)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.medicationOrderLineTable.itemMasterId,
				table.itemMasterTable.id
			)
		)
		.where(
			and(
				eq(table.medicationOrderLineTable.batchId, batchId),
				isNull(table.medicationOrderLineTable.deletedAt)
			)
		)
		.orderBy(table.medicationOrderLineTable.lineNo);

	if (lines.length === 0) {
		throw error(400, 'Batch has no lines');
	}

	const saveLines: MedicationOrderLineSaveInput[] = lines.map((r) => ({
		itemMasterId: r.line.itemMasterId,
		dose: String(r.line.dose),
		doseUnitId: r.line.doseUnitId,
		frequencyId: r.line.frequencyId,
		durationValue: String(r.line.durationValue),
		durationUnitId: r.line.durationUnitId,
		formId: r.line.formId,
		routeId: r.line.routeId,
		orderTypeId: r.line.orderTypeId,
		foodRelationId: r.line.foodRelationId,
		startAt: r.line.startAt,
		testDose: r.line.testDose,
		substituteNotAllowed: r.line.substituteNotAllowed,
		lineRemarks: r.line.lineRemarks,
		unitSalePrice: String(r.line.unitSalePrice ?? '0'),
		issueQtyPurchase: String(r.line.issueQtyPurchase ?? '0'),
		itemUnitMasterId: Number(r.line.itemUnitMasterId ?? 0),
		allocations: []
	}));

	const amountDue = computeBatchTotalFromLines(saveLines);
	const paidN = Math.round(Number(amountPaid) * 100) / 100;
	const dueN = Math.round(Number(amountDue) * 100) / 100;
	if (paidN + 1e-9 < dueN) {
		throw error(400, 'Amount paid is less than amount due');
	}

	const financialYearId = await getFinancialYearIdToday(hospitalId);
	const receiptNo = await generatePrefix({
		hospitalId,
		branchId: null,
		financialYearId,
		prefixKey: PREFIX_PURPOSE_STORAGE.MEDICATION_ORDER_RECEIPT_NO,
		context: {}
	});

	const userId = event.locals.user?.id ?? null;
	const paidAt = new Date().toISOString();

	await db.insert(table.medicationOrderBatchPaymentTable).values({
		hospitalId,
		batchId,
		paymentMethod,
		amountDue,
		amountPaid: String(paidN),
		paidAt,
		receiptNo,
		createdBy: userId,
		updatedBy: userId
	});

	const outLines = lines.map((r) => {
		const issueQtyPurchase = String(r.line.issueQtyPurchase ?? '0');
		const unitSalePrice = String(r.line.unitSalePrice ?? '0');
		return {
			itemName: r.itemName,
			issueQtyPurchase,
			unitSalePrice,
			lineTotal: computeLineTotal({
				issueQtyPurchase,
				unitSalePrice
			}).toFixed(2),
			lineRemarks: r.line.lineRemarks
		};
	});

	return {
		receiptNo,
		amountDue,
		amountPaid: String(paidN),
		paymentMethod,
		paidAt,
		batch: {
			id: batch.id,
			batchNo: batch.batchNo,
			extCustomerName: batch.extCustomerName,
			advisingDoctor: batch.advisingDoctor,
			storeId: batch.storeId
		},
		lines: outLines
	};
}
