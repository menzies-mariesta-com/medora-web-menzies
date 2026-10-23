import { type RequestEvent } from '@sveltejs/kit';
import { requireDoctorContext } from '$lib/server/medora/doctor-portal/doctor-context.server';
import { listDoctorSchedule } from '$lib/server/medora/doctor-portal/doctor-schedule.server';
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
	const branchId = event.url.searchParams.get('branchId')?.trim() || null;
	const rows = await listDoctorSchedule(ctx, branchId);
	return doctorJson(event, { schedules: rows });
}
