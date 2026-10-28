import { type RequestEvent } from '@sveltejs/kit';
import {
	DoctorAuthError,
	signInDoctor
} from '$lib/server/medora/doctor-portal/doctor-auth.server';
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

	const body = (await event.request.json().catch(() => null)) as {
		email?: string;
		password?: string;
		trustDeviceCookie?: string;
	} | null;
	const email =
		typeof body?.email === 'string'
			? body.email.trim().toLowerCase()
			: '';
	const password =
		typeof body?.password === 'string' ? body.password : '';
	const trustDeviceCookie =
		typeof body?.trustDeviceCookie === 'string'
			? body.trustDeviceCookie
			: undefined;
	if (!email || !password) {
		return doctorJson(
			event,
			{ message: 'Email and password are required' },
			{ status: 400 }
		);
	}

	try {
		const result = await signInDoctor({
			event,
			email,
			password,
			trustDeviceCookie
		});
		if (result.twoFactorRequired) {
			return doctorJson(event, result);
		}
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
