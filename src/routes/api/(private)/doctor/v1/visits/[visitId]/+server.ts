import { error, type RequestEvent } from '@sveltejs/kit';
import { requireDoctorContext } from '$lib/server/medora/doctor-portal/doctor-context.server';
import { getDoctorVisitDetail } from '$lib/server/medora/doctor-portal/doctor-visits.server';
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
	const visit = await getDoctorVisitDetail(
		ctx,
		event.params.visitId ?? ''
	);
	if (!visit) throw error(404, 'Visit not found');
	return doctorJson(event, visit);
}
