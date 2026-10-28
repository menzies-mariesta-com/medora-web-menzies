import { error, type RequestEvent } from '@sveltejs/kit';
import { requireDoctorContext } from '$lib/server/medora/doctor-portal/doctor-context.server';
import { getDoctorPatient } from '$lib/server/medora/doctor-portal/doctor-patients.server';
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
	const patientId = event.params.patientId;
	if (!patientId) throw error(400, 'Invalid patient id');
	const patient = await getDoctorPatient(ctx, patientId);
	if (!patient) throw error(404, 'Patient not found');
	return doctorJson(event, patient);
}
