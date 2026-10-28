import { error, type RequestEvent } from '@sveltejs/kit';
import { requirePatientReadContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import { getPatientVisitDetail } from '$lib/server/medora/patient-portal/visits.server';
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
	const visit = await getPatientVisitDetail(
		ctx,
		event.params.visitId
	);
	if (!visit) throw error(404, 'Visit not found');
	return patientJson(event, visit);
}
