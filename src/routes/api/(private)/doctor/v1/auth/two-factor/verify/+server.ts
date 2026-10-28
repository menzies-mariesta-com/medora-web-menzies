import { type RequestEvent } from '@sveltejs/kit';
import {
	DoctorAuthError,
	verifyDoctorTwoFactor
} from '$lib/server/medora/doctor-portal/doctor-auth.server';
import {
	doctorJson,
	handleDoctorOptions
} from '$lib/server/medora/doctor-portal/doctor-api-response.server';

type VerifyBody = {
	twoFactorCookie?: string;
	code?: string;
	method?: string;
	trustDevice?: boolean;
};

export async function OPTIONS(event: RequestEvent) {
	return handleDoctorOptions(event)!;
}

export async function POST(event: RequestEvent) {
	const preflight = handleDoctorOptions(event);
	if (preflight) return preflight;

	const body = (await event.request.json().catch(() => null)) as
		| VerifyBody
		| null;
	const twoFactorCookie =
		typeof body?.twoFactorCookie === 'string'
			? body.twoFactorCookie
			: '';
	const code = typeof body?.code === 'string' ? body.code : '';
	const method = body?.method === 'backupCode' ? 'backupCode' : 'totp';
	if (!twoFactorCookie || !code.trim()) {
		return doctorJson(
			event,
			{ message: 'Verification code and challenge are required' },
			{ status: 400 }
		);
	}

	try {
		const result = await verifyDoctorTwoFactor({
			event,
			twoFactorCookie,
			code,
			method,
			trustDevice: body?.trustDevice === true
		});
		return doctorJson(event, result, {
			headers: { 'set-auth-token': result.token }
		});
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
