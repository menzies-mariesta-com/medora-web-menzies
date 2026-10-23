import { type RequestEvent } from '@sveltejs/kit';
import { auth } from '$lib/auth/server';
import { env } from '$env/dynamic/private';
import {
	doctorJson,
	handleDoctorOptions
} from '$lib/server/medora/doctor-portal/doctor-api-response.server';

function configuredAuthOrigin(): string {
	const raw =
		env.BETTER_AUTH_BASE_URL ||
		env.BETTER_AUTH_URL ||
		'http://localhost:4002';
	try {
		return new URL(raw).origin;
	} catch {
		return 'http://localhost:4002';
	}
}

export async function OPTIONS(event: RequestEvent) {
	return handleDoctorOptions(event)!;
}

export async function POST(event: RequestEvent) {
	const preflight = handleDoctorOptions(event);
	if (preflight) return preflight;

	const body = (await event.request.json().catch(() => null)) as {
		email?: unknown;
	} | null;
	const email =
		typeof body?.email === 'string'
			? body.email.trim().toLowerCase()
			: '';
	if (!email) {
		return doctorJson(
			event,
			{ message: 'Email is required' },
			{ status: 400 }
		);
	}

	const origin = configuredAuthOrigin();
	try {
		await auth.api.requestPasswordReset({
			body: {
				email,
				redirectTo: `${origin}/auth/reset-password`
			},
			headers: new Headers({
				'content-type': 'application/json',
				origin
			}),
			asResponse: true
		});
	} catch {
		// Do not reveal whether the account exists.
	}

	return doctorJson(event, {
		status: true,
		message:
			'If this email exists in our system, check your email for the reset link'
	});
}
