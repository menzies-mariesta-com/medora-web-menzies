import { type RequestEvent } from '@sveltejs/kit';
import { requirePatientReadContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import {
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
	const ctx = await requirePatientReadContext(event);
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
