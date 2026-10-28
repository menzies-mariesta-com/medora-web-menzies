import { type RequestEvent } from '@sveltejs/kit';
import { requirePatientReadContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import { buildPatientMeDto } from '$lib/server/medora/patient-portal/me.server';
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
	return patientJson(event, await buildPatientMeDto(ctx));
}
