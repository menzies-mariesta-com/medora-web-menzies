import { and, desc, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { PatientPortalContext } from './require-patient-context.server';
import { writePatientPortalAudit } from './audit.server';

export async function listPatientPrescriptions(
	ctx: PatientPortalContext,
	endpoint: string
) {
	await writePatientPortalAudit({
		userId: ctx.userId,
		patientId: ctx.patientId,
		hospitalId: ctx.hospitalId,
		endpoint
	});

	const rows = await ensureDb()
		.select({
			lineId: table.medicationOrderLineTable.id,
			itemName: table.itemMasterTable.itemName,
			dose: table.medicationOrderLineTable.dose,
			startAt: table.medicationOrderLineTable.startAt,
			visitId: table.medicationOrderBatchTable.visitId,
			advisingDoctor: table.medicationOrderBatchTable.advisingDoctor,
			frequencyName: table.medOrderFrequencyTable.label,
			doseUnitName: table.medOrderDoseUnitTable.name
		})
		.from(table.medicationOrderLineTable)
		.innerJoin(
			table.medicationOrderBatchTable,
			eq(
				table.medicationOrderLineTable.batchId,
				table.medicationOrderBatchTable.id
			)
		)
		.innerJoin(
			table.patientVisitTable,
			eq(
				table.medicationOrderBatchTable.visitId,
				table.patientVisitTable.id
			)
		)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.medicationOrderLineTable.itemMasterId,
				table.itemMasterTable.id
			)
		)
		.innerJoin(
			table.medOrderFrequencyTable,
			eq(
				table.medicationOrderLineTable.frequencyId,
				table.medOrderFrequencyTable.id
			)
		)
		.innerJoin(
			table.medOrderDoseUnitTable,
			eq(
				table.medicationOrderLineTable.doseUnitId,
				table.medOrderDoseUnitTable.id
			)
		)
		.where(
			and(
				eq(table.patientVisitTable.patientId, ctx.patientId),
				eq(table.medicationOrderBatchTable.hospitalId, ctx.hospitalId)
			)
		)
		.orderBy(desc(table.medicationOrderLineTable.startAt));

	return rows;
}
