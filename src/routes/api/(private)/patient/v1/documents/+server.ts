import { type RequestEvent } from '@sveltejs/kit';
import { requirePatientReadContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import { listPatientDocuments } from '$lib/server/medora/patient-portal/documents.server';
import {
	handlePatientOptions,
	patientJson
} from '$lib/server/medora/patient-portal/patient-api-response.server';

export async function OPTIONS(event: RequestEvent) {
	return handlePatientOptions(event)!;
}

export async function GET(event: RequestEvent) {
	const preflight = handlePatientOptions(event);
	if (preflight) return preflight;
	const ctx = await requirePatientReadContext(event);
	const documents = await listPatientDocuments(ctx);
	return patientJson(event, { documents });
}
