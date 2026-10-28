import { error, type RequestEvent } from '@sveltejs/kit';
import { requirePatientReadContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import { getPatientPhoto } from '$lib/server/medora/patient-portal/me.server';
import { streamPatientStorageObject } from '$lib/server/medora/patient-portal/patient-file-response.server';
import { handlePatientOptions } from '$lib/server/medora/patient-portal/patient-api-response.server';

export async function OPTIONS(event: RequestEvent) {
	return handlePatientOptions(event)!;
}

export async function GET(event: RequestEvent) {
	const preflight = handlePatientOptions(event);
	if (preflight) return preflight;
	const ctx = await requirePatientReadContext(event);
	const photo = await getPatientPhoto(ctx);
	if (!photo) throw error(404, 'Photo not found');
	return streamPatientStorageObject(
		event,
		photo.storageKey,
		photo.contentType
	);
}
