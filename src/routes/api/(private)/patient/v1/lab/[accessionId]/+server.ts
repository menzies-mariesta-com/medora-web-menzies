import { error, type RequestEvent } from '@sveltejs/kit';
import { requirePatientReadContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import { getPatientReleasedLabResult } from '$lib/server/medora/patient-portal/lab.server';
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
	const accessionId = Number(event.params.accessionId);
	if (!Number.isInteger(accessionId))
		throw error(400, 'Invalid result id');
	const result = await getPatientReleasedLabResult(ctx, accessionId);
	if (!result) throw error(404, 'Lab result not found');
	return patientJson(event, result);
}
