import { type RequestEvent } from '@sveltejs/kit';
import { requirePatientReadContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import { listPatientReleasedLabResults } from '$lib/server/medora/patient-portal/lab.server';
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
	const results = await listPatientReleasedLabResults(ctx);
	return patientJson(event, { results });
}
