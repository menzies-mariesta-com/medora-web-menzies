import type { RequestEvent } from '@sveltejs/kit';
import { eq, like, or } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { RoleEnum } from '$lib/model/enum/db-link';

async function canAccessPatientRecord(
	event: RequestEvent,
	patientId: string
): Promise<boolean> {
	if (event.locals.userRoleId === RoleEnum.PATIENT) {
		return event.locals.patient?.id === patientId;
	}
	if (!event.locals.user) return false;
	if (
		event.locals.userRoleId === RoleEnum.SYSTEM_ADMIN ||
		event.locals.userRoleId === RoleEnum.ADMIN_TEAM
	) {
		return true;
	}
	if (!event.locals.staff) return false;
	const allowed = event.locals.allowedHospitalIds;
	if (!allowed) return true;
	const [patient] = await ensureDb()
		.select({ hospitalId: table.patientTable.hospitalId })
		.from(table.patientTable)
		.where(eq(table.patientTable.id, patientId))
		.limit(1);
	return Boolean(patient && allowed.includes(patient.hospitalId));
}

/**
 * Authorize a stored patient attachment. Staff must belong to a hospital that
 * can see the patient; a patient may only read their own attachments.
 */
export async function canAccessPatientAttachment(
	event: RequestEvent,
	storageKey: string
): Promise<boolean> {
	const url = `/api/patient-attachment/${storageKey}`;
	const attachment =
		await ensureDb().query.patientAttachmentTable.findFirst({
			where: or(
				eq(table.patientAttachmentTable.fileUrl, url),
				like(table.patientAttachmentTable.fileUrl, `%${url}`)
			),
			columns: { patientId: true }
		});
	if (!attachment) return false;
	return canAccessPatientRecord(event, attachment.patientId);
}

/** Authorize a stored patient photo (staff or the owning patient). */
export async function canAccessPatientPhoto(
	event: RequestEvent,
	storageKey: string
): Promise<boolean> {
	const url = `/api/patient-photo/${storageKey}`;
	const patient = await ensureDb().query.patientTable.findFirst({
		where: or(
			eq(table.patientTable.photoPath, url),
			like(table.patientTable.photoPath, `%${url}`)
		),
		columns: { id: true }
	});
	if (!patient) return false;
	return canAccessPatientRecord(event, patient.id);
}
