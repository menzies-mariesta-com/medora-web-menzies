import type { DoctorPortalContext } from './doctor-context.server';
import {
	listDoctorAppointments,
	listDoctorTodayAppointments
} from './doctor-appointments.server';
import {
	countDoctorLabResults,
	listDoctorLabResults
} from './doctor-results.server';
import { listDoctorVisits } from './doctor-visits.server';
import { addDaysIso, todayIso } from './doctor-utils.server';

export async function buildDoctorSummary(ctx: DoctorPortalContext) {
	const today = todayIso();
	const [
		todayAppointments,
		todayVisits,
		nextAppointments,
		recentVisits,
		recentResults,
		resultsReady
	] = await Promise.all([
		listDoctorTodayAppointments(ctx),
		listDoctorVisits(ctx, {
			from: today,
			to: today,
			limit: 100
		}),
		listDoctorAppointments(ctx, {
			from: today,
			to: addDaysIso(today, 7),
			limit: 5
		}),
		listDoctorVisits(ctx, {
			from: addDaysIso(today, -7),
			to: today,
			limit: 5
		}),
		listDoctorLabResults(ctx, { limit: 5 }),
		countDoctorLabResults(ctx)
	]);

	const patientIds = new Set<string>();
	for (const appointment of todayAppointments) {
		if (appointment.patientId) patientIds.add(appointment.patientId);
	}
	for (const visit of todayVisits) {
		if (visit.patientId) patientIds.add(visit.patientId);
	}

	return {
		date: today,
		stats: {
			appointmentsToday: todayAppointments.length,
			visitsToday: todayVisits.length,
			patientsToday: patientIds.size,
			resultsReady
		},
		todayAppointments,
		nextAppointments,
		recentVisits,
		recentResults
	};
}
