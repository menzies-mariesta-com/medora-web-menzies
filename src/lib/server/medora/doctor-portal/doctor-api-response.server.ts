import { json, type RequestEvent } from '@sveltejs/kit';
import {
	applyCorsToResponse,
	optionsPreflightResponse
} from '$lib/server/http/cors-patient-api.server';

export function doctorJson(
	event: RequestEvent,
	data: unknown,
	init?: ResponseInit
): Response {
	const body = json(data, init);
	return applyCorsToResponse(body, event.request);
}

export function handleDoctorOptions(
	event: RequestEvent
): Response | null {
	if (event.request.method === 'OPTIONS') {
		return optionsPreflightResponse(event.request);
	}
	return null;
}
