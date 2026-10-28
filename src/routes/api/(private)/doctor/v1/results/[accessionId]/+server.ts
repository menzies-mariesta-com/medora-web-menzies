import { error, type RequestEvent } from '@sveltejs/kit';
import { requireDoctorContext } from '$lib/server/medora/doctor-portal/doctor-context.server';
import { getDoctorLabResult } from '$lib/server/medora/doctor-portal/doctor-results.server';
import {
	doctorJson,
	handleDoctorOptions
} from '$lib/server/medora/doctor-portal/doctor-api-response.server';

export async function OPTIONS(event: RequestEvent) {
	return handleDoctorOptions(event)!;
}

export async function GET(event: RequestEvent) {
	const preflight = handleDoctorOptions(event);
	if (preflight) return preflight;
	const ctx = requireDoctorContext(event);
	const accessionId = Number(event.params.accessionId);
	if (!Number.isInteger(accessionId)) {
		throw error(400, 'Invalid result id');
	}
	const result = await getDoctorLabResult(ctx, accessionId);
	if (!result) throw error(404, 'Lab result not found');
	return doctorJson(event, result);
}
