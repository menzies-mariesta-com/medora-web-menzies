import { error, type RequestEvent } from '@sveltejs/kit';
import { requirePatientContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import {
	buildPatientMeDto,
	patchPatientProfile
} from '$lib/server/medora/patient-portal/me.server';
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
	return patientJson(event, await buildPatientMeDto(ctx));
}

export async function PATCH(event: RequestEvent) {
	const preflight = handlePatientOptions(event);
	if (preflight) return preflight;
	const ctx = requirePatientContext(event);
	const body = (await event.request.json()) as Record<string, unknown>;
	const updated = await patchPatientProfile(ctx, {
		phonePrimary:
			body.phonePrimary != null
				? String(body.phonePrimary)
				: undefined,
		address:
			body.address != null ? String(body.address) : undefined,
		photoPath:
			body.photoPath != null ? String(body.photoPath) : undefined
	});
	return patientJson(event, updated);
}

export async function POST() {
	throw error(405, 'Method not allowed');
}
