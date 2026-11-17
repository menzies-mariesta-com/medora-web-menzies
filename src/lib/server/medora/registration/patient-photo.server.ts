import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { TigrisUtil } from '$lib/util/tigris.util.svelte';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';

export const PATIENT_PHOTO_KEY_PREFIX = 'patient-photos/';

/** Extract the Tigris key from a stored `/api/patient-photo/...` URL or a raw Tigris URL. */
export function patientPhotoStorageKey(
	photoPath: string | null | undefined
): string | null {
	if (!photoPath) return null;
	const marker = '/api/patient-photo/';
	const index = photoPath.indexOf(marker);
	// Legacy rows may hold the raw Tigris URL; fall back to its pathname.
	const raw =
		index < 0
			? photoPath.replace(/^https?:\/\/[^/]+/i, '')
			: photoPath.slice(index + marker.length);
	const key = raw.replace(/^\//, '');
	if (!key || key.includes('..')) return null;
	return key.startsWith(PATIENT_PHOTO_KEY_PREFIX) ? key : null;
}

/**
 * Reject a client-supplied photo path that is not stored under this hospital's
 * prefix, so one hospital cannot reference (and read) another hospital's photo.
 */
export function assertPatientPhotoPathForHospital(
	photoPath: string | null | undefined,
	hospitalId: string
): void {
	if (!photoPath) return;
	const key = patientPhotoStorageKey(photoPath);
	if (!key?.startsWith(`${PATIENT_PHOTO_KEY_PREFIX}${hospitalId}/`)) {
		throw error(400, 'Invalid patient photo path');
	}
}

/**
 * Best-effort delete of a stored patient photo object.
 * Never throws: the DB row is the source of truth for the caller.
 */
export async function deletePatientPhotoObject(
	photoPath: string | null | undefined
): Promise<void> {
	const key = patientPhotoStorageKey(photoPath);
	if (!key) return;
	try {
		await TigrisUtil.deleteObject(key);
	} catch (err) {
		console.error('[patient-photo] Tigris delete failed', key, err);
	}
}

/**
 * Delete a freshly uploaded photo that no patient row references yet
 * (user captured, then removed / left the form before saving).
 * Gated on the hospital path segment so a hospital cannot delete another's file.
 */
export async function discardUnreferencedPatientPhoto(
	event: RequestEvent,
	input: { hospitalId: string; photoPath: string }
): Promise<void> {
	const { hospitalId, photoPath } = input;
	await ensureCanAccessHospital(event, hospitalId);

	const key = patientPhotoStorageKey(photoPath);
	if (!key?.startsWith(`${PATIENT_PHOTO_KEY_PREFIX}${hospitalId}/`))
		return;

	const [referencing] = await ensureDb()
		.select({ id: table.patientTable.id })
		.from(table.patientTable)
		.where(eq(table.patientTable.photoPath, photoPath))
		.limit(1);
	if (referencing) return;

	await deletePatientPhotoObject(photoPath);
}
