import { type RequestEvent } from '@sveltejs/kit';
import {
	DoctorAuthError,
	changeDoctorPassword
} from '$lib/server/medora/doctor-portal/doctor-auth.server';
import { requireDoctorContext } from '$lib/server/medora/doctor-portal/doctor-context.server';
import {
	doctorJson,
	handleDoctorOptions
} from '$lib/server/medora/doctor-portal/doctor-api-response.server';

export async function OPTIONS(event: RequestEvent) {
	return handleDoctorOptions(event)!;
}

export async function POST(event: RequestEvent) {
	const preflight = handleDoctorOptions(event);
	if (preflight) return preflight;

	const ctx = requireDoctorContext(event, {
		allowBeforePasswordChange: true
	});
	const body = (await event.request.json().catch(() => null)) as {
		currentPassword?: string;
		newPassword?: string;
		confirmPassword?: string;
	} | null;

	try {
		await changeDoctorPassword({
			userId: ctx.userId,
			currentSessionToken: event.locals.session?.token,
			currentPassword:
				typeof body?.currentPassword === 'string'
					? body.currentPassword
					: '',
			newPassword:
				typeof body?.newPassword === 'string'
					? body.newPassword
					: '',
			confirmPassword:
				typeof body?.confirmPassword === 'string'
					? body.confirmPassword
					: ''
		});
		return doctorJson(event, { ok: true, mustChangePassword: false });
	} catch (error) {
		if (error instanceof DoctorAuthError) {
			return doctorJson(
				event,
				{ message: error.message },
				{ status: error.status }
			);
		}
		throw error;
	}
}
