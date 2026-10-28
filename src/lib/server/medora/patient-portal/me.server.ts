import { eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { PatientPortalContext } from './require-patient-context.server';

export const PATIENT_PHOTO_CONTENT_PATH = '/api/patient/v1/me/photo';

function displayName(
	patient: PatientPortalContext['patient']
): string {
	const parts = [
		patient.firstName,
		patient.middleName,
		patient.lastName
	].filter(Boolean);
	return parts.join(' ').trim() || patient.user?.name || 'Patient';
}

export async function buildPatientMeDto(ctx: PatientPortalContext) {
	const { patient } = ctx;
	const [userRow] = await ensureDb()
		.select({
			mustChangePassword: table.userTable.mustChangePassword
		})
		.from(table.userTable)
		.where(eq(table.userTable.id, ctx.userId))
		.limit(1);

	return {
		userId: ctx.userId,
		patientId: ctx.patientId,
		hospitalId: ctx.hospitalId,
		mustChangePassword: Boolean(userRow?.mustChangePassword),
		hospitalName: patient.hospital?.name ?? null,
		patientCode: patient.code ?? null,
		displayName: displayName(patient),
		firstName: patient.firstName,
		middleName: patient.middleName,
		lastName: patient.lastName,
		dateOfBirth: patient.dateOfBirth,
		phonePrimary: patient.phonePrimary,
		address: patient.address,
		// Storage paths stay server-side; the app fetches bytes from the
		// authenticated endpoint below.
		photoUrl: patient.photoPath ? PATIENT_PHOTO_CONTENT_PATH : null,
		email: patient.user?.email ?? null,
		gender: patient.gender?.name ?? null,
		title: patient.title?.name ?? null
	};
}

/** Extract the Tigris key from a stored `/api/patient-photo/...` URL. */
export function patientPhotoStorageKey(
	photoPath: string | null
): string | null {
	if (!photoPath) return null;
	const marker = '/api/patient-photo/';
	const index = photoPath.indexOf(marker);
	if (index < 0) return null;
	const key = photoPath.slice(index + marker.length);
	if (!key || key.includes('..')) return null;
	return key.startsWith('patient-photos/') ? key : null;
}

export async function getPatientPhoto(ctx: PatientPortalContext) {
	const key = patientPhotoStorageKey(ctx.patient.photoPath ?? null);
	if (!key) return null;
	const ext = key.split('.').pop()?.toLowerCase() ?? '';
	const contentType =
		ext === 'png'
			? 'image/png'
			: ext === 'webp'
				? 'image/webp'
				: ext === 'gif'
					? 'image/gif'
					: 'image/jpeg';
	return { storageKey: key, contentType };
}
