import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	VisitStatusTaggingEnum,
	VisitTypeEnum
} from '$lib/model/enum/db-link';

type Db = ReturnType<typeof ensureDb>;

/**
 * External Sales visits: OPD visit with at least one external-origin medication batch
 * (`ext_customer_name` set on the batch).
 */
export async function isExternalSaleOpVisit(
	db: Db,
	input: { hospitalId: string; visitId: string }
): Promise<boolean> {
	const [visit] = await db
		.select({ visitTypeId: table.patientVisitTable.visitTypeId })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!visit || visit.visitTypeId !== VisitTypeEnum.OPD) {
		return false;
	}

	const [batch] = await db
		.select({ id: table.medicationOrderBatchTable.id })
		.from(table.medicationOrderBatchTable)
		.where(
			and(
				eq(table.medicationOrderBatchTable.visitId, input.visitId),
				eq(
					table.medicationOrderBatchTable.hospitalId,
					input.hospitalId
				),
				isNotNull(table.medicationOrderBatchTable.extCustomerName),
				isNull(table.medicationOrderBatchTable.deletedAt)
			)
		)
		.limit(1);

	return batch != null;
}

/** After OP bill close, mark the external-sale visit Closed / Discharged. */
export async function closeExternalSaleVisitOnOpBillClosed(
	db: Db,
	input: {
		hospitalId: string;
		visitId: string;
		userId: string;
		nowIso: string;
	}
): Promise<void> {
	if (
		!(await isExternalSaleOpVisit(db, {
			hospitalId: input.hospitalId,
			visitId: input.visitId
		}))
	) {
		return;
	}

	const [visit] = await db
		.select({
			statusTaggingId: table.patientVisitTable.statusTaggingId
		})
		.from(table.patientVisitTable)
		.where(eq(table.patientVisitTable.id, input.visitId))
		.limit(1);

	if (
		visit?.statusTaggingId === VisitStatusTaggingEnum.CLOSED_DISCHARGED
	) {
		return;
	}

	await db
		.update(table.patientVisitTable)
		.set({
			statusTaggingId: VisitStatusTaggingEnum.CLOSED_DISCHARGED,
			updatedAt: input.nowIso,
			updatedBy: input.userId
		})
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		);
}
