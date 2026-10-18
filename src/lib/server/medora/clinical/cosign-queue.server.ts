import { and, eq, isNull } from 'drizzle-orm';
import { StaffTypeEnum } from '$lib/model/enum/db-link';
import { CosignWorkItemTypeEnum } from '$lib/model/enum/clinical-platform.enum';
import type { CosignWorkItemRow } from '$lib/model/type/medora/clinical-platform.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listPendingCosignWork(input: {
	hospitalId: string;
}): Promise<CosignWorkItemRow[]> {
	const db = ensureDb();
	const items: CosignWorkItemRow[] = [];

	const progressNotes = await db
		.select({
			id: table.progressNoteTable.id,
			visitId: table.progressNoteTable.visitId,
			createdAt: table.progressNoteTable.createdAt,
			staffTypeId: table.staffTable.staffTypeId
		})
		.from(table.progressNoteTable)
		.innerJoin(
			table.staffTable,
			eq(table.progressNoteTable.doctorId, table.staffTable.id)
		)
		.innerJoin(
			table.patientVisitTable,
			eq(table.progressNoteTable.visitId, table.patientVisitTable.id)
		)
		.where(
			and(
				eq(table.patientVisitTable.hospitalId, input.hospitalId),
				isNull(table.progressNoteTable.cosignedAt),
				eq(table.staffTable.staffTypeId, StaffTypeEnum.MEDICAL_OFFICER)
			)
		);
	for (const n of progressNotes) {
		items.push({
			workType: CosignWorkItemTypeEnum.PROGRESS_NOTE,
			entityId: n.id,
			visitId: n.visitId,
			title: `Progress note #${n.id}`,
			createdAt: n.createdAt ?? '',
			deepLink: `/medora/hospital/${input.hospitalId}/home/consultation/emr?visitId=${n.visitId}`
		});
	}

	const medBatches = await db
		.select({
			id: table.medicationOrderBatchTable.id,
			visitId: table.medicationOrderBatchTable.visitId,
			createdAt: table.medicationOrderBatchTable.createdAt,
			batchNo: table.medicationOrderBatchTable.batchNo
		})
		.from(table.medicationOrderBatchTable)
		.innerJoin(
			table.staffTable,
			eq(
				table.medicationOrderBatchTable.orderingStaffId,
				table.staffTable.id
			)
		)
		.where(
			and(
				eq(table.medicationOrderBatchTable.hospitalId, input.hospitalId),
				isNull(table.medicationOrderBatchTable.consultantCosignedAt),
				eq(table.staffTable.staffTypeId, StaffTypeEnum.MEDICAL_OFFICER)
			)
		);
	for (const b of medBatches) {
		items.push({
			workType: CosignWorkItemTypeEnum.MEDICATION_ORDER,
			entityId: b.id,
			visitId: b.visitId,
			title: `Medication order ${b.batchNo}`,
			createdAt: b.createdAt ?? '',
			deepLink: `/medora/hospital/${input.hospitalId}/home/consultation/cpoe/prescription?visitId=${b.visitId ?? ''}`
		});
	}

	return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
