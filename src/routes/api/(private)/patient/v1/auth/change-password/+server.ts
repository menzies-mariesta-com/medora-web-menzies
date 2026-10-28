import { type RequestEvent } from '@sveltejs/kit';
import { requirePatientContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import { changePatientPortalPassword } from '$lib/server/medora/patient-portal/patient-auth.server';
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
	const ctx = requirePatientContext(event, {
		allowBeforePasswordChange: true
	});
	const body = (await event.request.json()) as Record<string, unknown>;
	await changePatientPortalPassword({
		userId: ctx.userId,
		currentPassword: String(body.currentPassword ?? ''),
		newPassword: String(body.newPassword ?? ''),
		confirmPassword: String(body.confirmPassword ?? '')
	});
	return patientJson(event, { ok: true, mustChangePassword: false });
}
