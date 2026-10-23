import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PatientPortalContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import { getPatientDocument } from '$lib/server/medora/patient-portal/documents.server';
import { streamPatientStorageObject } from '$lib/server/medora/patient-portal/patient-file-response.server';
import { requireDoctorContext } from '$lib/server/medora/doctor-portal/doctor-context.server';
import { handleDoctorOptions } from '$lib/server/medora/doctor-portal/doctor-api-response.server';

export async function OPTIONS(event: RequestEvent) {
	return handleDoctorOptions(event)!;
}

export async function GET(event: RequestEvent) {
	const preflight = handleDoctorOptions(event);
	if (preflight) return preflight;
	const ctx = requireDoctorContext(event);
	const documentId = Number(event.params.documentId);
	if (!Number.isInteger(documentId)) {
		throw error(400, 'Invalid document id');
	}

	const attachment =
		await ensureDb().query.patientAttachmentTable.findFirst({
			where: and(
				eq(table.patientAttachmentTable.id, documentId),
				ne(table.patientAttachmentTable.statusId, StatusEnum.DELETED)
			)
		});
	if (!attachment) throw error(404, 'Document not found');

	const patient = await ensureDb().query.patientTable.findFirst({
		where: and(
			eq(table.patientTable.id, attachment.patientId),
			eq(table.patientTable.hospitalId, ctx.hospitalId),
			ne(table.patientTable.statusId, StatusEnum.DELETED)
		),
		columns: { id: true }
	});
	if (!patient) throw error(404, 'Document not found');

	const clinicalCtx = {
		userId: ctx.userId,
		patientId: patient.id,
		hospitalId: ctx.hospitalId
	} as PatientPortalContext;
	const document = await getPatientDocument(clinicalCtx, documentId);
	if (!document) throw error(404, 'Document not found');

	return streamPatientStorageObject(
		event,
		document.storageKey,
		document.contentType,
		document.description ?? document.storageKey.split('/').pop()
	);
}
