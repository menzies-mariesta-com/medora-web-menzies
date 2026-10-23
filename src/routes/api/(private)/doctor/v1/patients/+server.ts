import { type RequestEvent } from '@sveltejs/kit';
import { requireDoctorContext } from '$lib/server/medora/doctor-portal/doctor-context.server';
import { listDoctorPatients } from '$lib/server/medora/doctor-portal/doctor-patients.server';
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
	const limit = Number(event.url.searchParams.get('limit') ?? '50');
	const offset = Number(event.url.searchParams.get('offset') ?? '0');
	const patients = await listDoctorPatients(ctx, {
		search: event.url.searchParams.get('search') ?? undefined,
		limit: Number.isFinite(limit) ? limit : 50,
		offset: Number.isFinite(offset) ? offset : 0
	});
	return doctorJson(event, { patients });
}
