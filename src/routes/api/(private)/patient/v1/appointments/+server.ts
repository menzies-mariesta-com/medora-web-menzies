import { error, type RequestEvent } from '@sveltejs/kit';
import { requirePatientContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import {
	bookPatientAppointment,
	cancelPatientAppointment,
	listPatientAppointments,
	listUpcomingPatientAppointments
} from '$lib/server/medora/patient-portal/appointments.server';
import {
	handlePatientOptions,
	patientJson
} from '$lib/server/medora/patient-portal/patient-api-response.server';

export async function OPTIONS(event: RequestEvent) {
	return handlePatientOptions(event)!;
}

export async function GET(event: RequestEvent) {
	const preflight = handlePatientOptions(event);
	if (preflight) return preflight;
	const ctx = requirePatientContext(event);
	const upcoming = event.url.searchParams.get('upcoming');
	if (upcoming === '1') {
		const from =
			event.url.searchParams.get('fromDate') ??
			new Date().toISOString().slice(0, 10);
		return patientJson(
			event,
			await listUpcomingPatientAppointments(ctx, from)
		);
	}
	return patientJson(event, await listPatientAppointments(ctx));
}

export async function POST(event: RequestEvent) {
	const preflight = handlePatientOptions(event);
	if (preflight) return preflight;
	const ctx = requirePatientContext(event);
	const body = (await event.request.json()) as Record<string, unknown>;
	const row = await bookPatientAppointment(ctx, {
		branchId: String(body.branchId ?? ''),
		staffId: String(body.staffId ?? ''),
		appointmentDate: String(body.appointmentDate ?? ''),
		fromTime: String(body.fromTime ?? ''),
		toTime: String(body.toTime ?? ''),
		remark: body.remark != null ? String(body.remark) : undefined
	});
	return patientJson(event, row, { status: 201 });
}

export async function PATCH(event: RequestEvent) {
	const preflight = handlePatientOptions(event);
	if (preflight) return preflight;
	const ctx = requirePatientContext(event);
	const body = (await event.request.json()) as Record<string, unknown>;
	const appointmentId = Number(body.appointmentId);
	if (!Number.isFinite(appointmentId)) {
		throw error(400, 'appointmentId is required');
	}
	const row = await cancelPatientAppointment(ctx, {
		appointmentId,
		cancelRemark: String(body.cancelRemark ?? 'Cancelled by patient')
	});
	if (!row) throw error(404, 'Appointment not found');
	return patientJson(event, row);
}
