import { type RequestEvent } from '@sveltejs/kit';
import { auth } from '$lib/auth/server';
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

	try {
		await auth.api.signOut({
			headers: event.request.headers,
			asResponse: true
		});
	} catch {
		// The local token is discarded by the app regardless of server state.
	}
	return doctorJson(event, { ok: true });
}
