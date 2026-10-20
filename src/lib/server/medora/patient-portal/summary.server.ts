import type { PatientPortalContext } from './require-patient-context.server';
import { listUpcomingPatientAppointments } from './appointments.server';
import { listPatientVisits } from './visits.server';
import { listPatientReleasedLabResults } from './lab.server';
import { listPatientBills } from './billing.server';

/**
 * Compact home payload so the app does not need four round-trips on launch.
 * Everything here is read-only.
 */
export async function buildPatientSummary(ctx: PatientPortalContext) {
	const today = new Date().toISOString().slice(0, 10);
	const [appointments, visits, labResults, bills] = await Promise.all(
		[
			listUpcomingPatientAppointments(ctx, today),
			listPatientVisits(ctx),
			listPatientReleasedLabResults(ctx),
			listPatientBills(ctx)
		]
	);

	return {
		nextAppointment: appointments[0] ?? null,
		latestVisit: visits[0] ?? null,
		latestLabResult: labResults[0] ?? null,
		bills: {
			count: bills.length,
			latest: bills[0] ?? null
		}
	};
}
