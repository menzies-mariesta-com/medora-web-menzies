import { type RequestEvent } from '@sveltejs/kit';
import { and, count, eq, inArray, isNull, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	OpBillingCloseBlockReason,
	OpBillingReadiness
} from '$lib/model/type/heka/op-billing.type';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { getNursingIncompleteLineCountForVisit } from '$lib/server/heka/emr/nursing-complete.server';

async function getTotalActiveServiceLineCountForVisit(input: {
	hospitalId: string;
	visitId: number;
}): Promise<number> {
	const orders = await ensureDb()
		.select({ id: table.serviceOrderTable.id })
		.from(table.serviceOrderTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.patientVisitTable.id, table.serviceOrderTable.visitId)
		)
		.where(
			and(
				eq(table.serviceOrderTable.visitId, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId),
				ne(table.serviceOrderTable.statusId, StatusEnum.DELETED)
			)
		);
	const orderIds = orders.map((o) => o.id);
	if (orderIds.length === 0) return 0;

	const rows = await ensureDb()
		.select({ n: count() })
		.from(table.serviceOrderDetailTable)
		.where(
			and(
				inArray(table.serviceOrderDetailTable.serviceOrderId, orderIds),
				eq(table.serviceOrderDetailTable.statusId, StatusEnum.ACTIVE)
			)
		);

	return Number(rows[0]?.n ?? 0);
}

async function getSavedMedicationLineCountForVisit(input: {
	hospitalId: string;
	visitId: number;
}): Promise<number> {
	const rows = await ensureDb()
		.select({ n: count() })
		.from(table.medicationOrderLineTable)
		.innerJoin(
			table.medicationOrderBatchTable,
			eq(
				table.medicationOrderLineTable.batchId,
				table.medicationOrderBatchTable.id
			)
		)
		.where(
			and(
				eq(table.medicationOrderBatchTable.visitId, input.visitId),
				eq(table.medicationOrderBatchTable.hospitalId, input.hospitalId),
				isNull(table.medicationOrderBatchTable.deletedAt),
				isNull(table.medicationOrderLineTable.deletedAt)
			)
		);

	return Number(rows[0]?.n ?? 0);
}

export function opBillingCloseBlockedMessage(
	blockReasonKey: OpBillingCloseBlockReason
): string {
	switch (blockReasonKey) {
		case 'nursing_incomplete':
			return 'Nursing complete is not finished; bill cannot be closed.';
		case 'no_billable_lines':
			return 'There are no billable lines on this bill.';
		case 'already_closed':
			return 'Bill is already closed.';
		default:
			return 'Bill cannot be closed.';
	}
}

export async function getOpBillingReadiness(
	event: RequestEvent,
	input: {
		hospitalId: string;
		visitId: number;
		pendingBillLineCount: number;
		billAlreadyClosed: boolean;
	}
): Promise<OpBillingReadiness> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const [nursingIncompleteCount, totalServiceLines, medicationLineCount] =
		await Promise.all([
			getNursingIncompleteLineCountForVisit(event, {
				hospitalId: input.hospitalId,
				visitId: input.visitId
			}),
			getTotalActiveServiceLineCountForVisit({
				hospitalId: input.hospitalId,
				visitId: input.visitId
			}),
			getSavedMedicationLineCountForVisit({
				hospitalId: input.hospitalId,
				visitId: input.visitId
			})
		]);

	const nursingCompleteCount = Math.max(
		0,
		totalServiceLines - nursingIncompleteCount
	);

	let blockReasonKey: OpBillingCloseBlockReason = null;
	let canCloseBill = false;

	if (input.billAlreadyClosed) {
		blockReasonKey = 'already_closed';
	} else if (nursingIncompleteCount > 0) {
		blockReasonKey = 'nursing_incomplete';
	} else if (input.pendingBillLineCount <= 0) {
		blockReasonKey = 'no_billable_lines';
	} else {
		canCloseBill = true;
	}

	return {
		totalServiceLines,
		nursingIncompleteCount,
		nursingCompleteCount,
		medicationLineCount,
		pendingBillLineCount: input.pendingBillLineCount,
		canCloseBill,
		blockReasonKey
	};
}
