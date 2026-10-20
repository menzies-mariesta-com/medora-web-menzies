import { error, type RequestEvent } from '@sveltejs/kit';
import { requirePatientReadContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import { getPatientDocument } from '$lib/server/medora/patient-portal/documents.server';
import { streamPatientStorageObject } from '$lib/server/medora/patient-portal/patient-file-response.server';
import { handlePatientOptions } from '$lib/server/medora/patient-portal/patient-api-response.server';

export async function OPTIONS(event: RequestEvent) {
	return handlePatientOptions(event)!;
}

export async function GET(event: RequestEvent) {
	const preflight = handlePatientOptions(event);
	if (preflight) return preflight;
	const ctx = await requirePatientReadContext(event);
	const documentId = Number(event.params.id);
	if (!Number.isInteger(documentId))
		throw error(400, 'Invalid document id');
	const document = await getPatientDocument(ctx, documentId);
	if (!document) throw error(404, 'Document not found');
	return streamPatientStorageObject(
		event,
		document.storageKey,
		document.contentType,
		document.description ?? document.storageKey.split('/').pop()
	);
}
