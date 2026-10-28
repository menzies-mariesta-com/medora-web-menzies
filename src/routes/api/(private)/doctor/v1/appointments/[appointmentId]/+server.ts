import { error, type RequestEvent } from '@sveltejs/kit';
import { requireDoctorContext } from '$lib/server/medora/doctor-portal/doctor-context.server';
import { getDoctorAppointment } from '$lib/server/medora/doctor-portal/doctor-appointments.server';
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
	const appointmentId = Number(event.params.appointmentId);
	if (!Number.isInteger(appointmentId)) {
		throw error(400, 'Invalid appointment id');
	}
	const appointment = await getDoctorAppointment(ctx, appointmentId);
	if (!appointment) throw error(404, 'Appointment not found');
	return doctorJson(event, appointment);
}
