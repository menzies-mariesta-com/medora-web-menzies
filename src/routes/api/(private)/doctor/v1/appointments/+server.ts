import { type RequestEvent } from '@sveltejs/kit';
import { requireDoctorContext } from '$lib/server/medora/doctor-portal/doctor-context.server';
import { listDoctorAppointments } from '$lib/server/medora/doctor-portal/doctor-appointments.server';
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
	const appointments = await listDoctorAppointments(ctx, {
		from: event.url.searchParams.get('from') ?? undefined,
		to: event.url.searchParams.get('to') ?? undefined,
		branchId: event.url.searchParams.get('branchId') ?? undefined,
		limit: Number.isFinite(limit) ? limit : 50
	});
	return doctorJson(event, { appointments });
}
