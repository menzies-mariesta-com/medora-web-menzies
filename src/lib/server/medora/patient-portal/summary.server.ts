import type { PatientPortalContext } from './require-patient-context.server';
import { listUpcomingPatientAppointments } from './appointments.server';
import { listPatientVisits } from './visits.server';
import { listPatientReleasedLabResults } from './lab.server';

/**
 * Compact home payload so the app does not need round-trips on launch.
 * Everything here is read-only. Billing is intentionally omitted while the
 * patient app keeps bills hidden.
 */
export async function buildPatientSummary(ctx: PatientPortalContext) {
	const today = new Date().toISOString().slice(0, 10);
	const [appointments, visits, labResults] = await Promise.all([
		listUpcomingPatientAppointments(ctx, today),
		listPatientVisits(ctx),
		listPatientReleasedLabResults(ctx)
	]);

	return {
		nextAppointment: appointments[0] ?? null,
		latestVisit: visits[0] ?? null,
		latestLabResult: labResults[0] ?? null
	};
}
