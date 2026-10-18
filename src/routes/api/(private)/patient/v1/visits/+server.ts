import { type RequestEvent } from '@sveltejs/kit';
import { requirePatientContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import { listPatientVisits } from '$lib/server/medora/patient-portal/visits.server';
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
	const ctx = requirePatientContext(event);
	const visits = await listPatientVisits(ctx, event.url.pathname);
	return patientJson(event, { visits });
}
