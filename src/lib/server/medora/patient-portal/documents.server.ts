import { and, desc, eq, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PatientPortalContext } from './require-patient-context.server';
import { writePatientPortalAudit } from './audit.server';

export async function listPatientDocuments(
	ctx: PatientPortalContext,
	endpoint: string
) {
	await writePatientPortalAudit({
		userId: ctx.userId,
		patientId: ctx.patientId,
		hospitalId: ctx.hospitalId,
		endpoint
	});

	return ensureDb().query.patientAttachmentTable.findMany({
		where: and(
			eq(table.patientAttachmentTable.patientId, ctx.patientId),
			ne(table.patientAttachmentTable.statusId, StatusEnum.DELETED)
		),
		orderBy: desc(table.patientAttachmentTable.createdAt)
	});
}
