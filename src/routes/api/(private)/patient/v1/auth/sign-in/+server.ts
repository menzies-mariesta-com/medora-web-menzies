import { type RequestEvent } from '@sveltejs/kit';
import { patientPortalSignIn } from '$lib/server/medora/patient-portal/patient-auth.server';
import {
	handlePatientOptions,
	patientJson
} from '$lib/server/medora/patient-portal/patient-api-response.server';

export async function OPTIONS(event: RequestEvent) {
	return handlePatientOptions(event)!;
}

export async function POST(event: RequestEvent) {
	const preflight = handlePatientOptions(event);
	if (preflight) return preflight;
	const body = (await event.request.json()) as Record<string, unknown>;
	const identifier = String(body.identifier ?? body.email ?? '').trim();
	const password = String(body.password ?? '');
	const result = await patientPortalSignIn({ identifier, password });
	const response = patientJson(event, {
		token: result.token,
		mustChangePassword: result.mustChangePassword,
		userId: result.userId,
		patientId: result.patientId,
		hospitalId: result.hospitalId,
		patientCode: result.patientCode
	});
	response.headers.set('set-auth-token', result.token);
	return response;
}
