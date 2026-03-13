import type { PageServerLoad } from './$types';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { and, count, eq, ne } from 'drizzle-orm';

type DailyVisitCount = {
	date: string; // YYYY-MM-DD
	count: number;
};

/** Check-in ratio: checked-in count vs confirmed count (for today's appointments). */
type CheckInRatio = {
	checkedIn: number;
	confirmed: number;
};

type DashboardStats = {
	doctors: number;
	patients: number;
	appointmentsToday: number;
	prescriptions: number | null;
	caseHistory: number;
	documents: number;
	invoices: number | null;
	unbill: number | null;
	checkInRatio: CheckInRatio;
	visitsLast7DaysTotal: number;
};

export const load: PageServerLoad = async ({ params }) => {
	const hospitalId = params.hospital_id;
	if (!hospitalId) {
		return {
			stats: null,
			visitsLast7Days: [] as DailyVisitCount[]
		};
	}

	const db = ensureDb();

	const [
		doctorScheduleRows,
		patientCountRows,
		appointmentRows,
		caseHistoryCountRows,
		documentCountRows,
		visitRows
	] = await Promise.all([
		// All doctor schedules for this hospital (to derive distinct doctors)
		db
			.select({
				staffId: table.doctorScheduleTable.staffId,
				statusId: table.doctorScheduleTable.statusId
			})
			.from(table.doctorScheduleTable)
			.where(eq(table.doctorScheduleTable.hospitalId, hospitalId)),
		// Patient count for this hospital (non-deleted)
		db
			.select({ count: count() })
			.from(table.patientTable)
			.where(
				and(
					eq(table.patientTable.hospitalId, hospitalId),
					ne(table.patientTable.statusId, StatusEnum.DELETED)
				)
			),
		// All appointments for this hospital (we'll filter "today" in memory; need statusTaggingId for check-in ratio)
		db
			.select({
				appointmentDate: table.appointmentTable.appointmentDate,
				statusId: table.appointmentTable.statusId,
				statusTaggingId: table.appointmentTable.statusTaggingId
			})
			.from(table.appointmentTable)
			.where(eq(table.appointmentTable.hospitalId, hospitalId)),
		// Case history: use patient diagnosis records scoped to hospital (non-deleted)
		db
			.select({ count: count() })
			.from(table.patientDiagnosisTable)
			.where(
				and(
					eq(table.patientDiagnosisTable.hospitalId, hospitalId),
					ne(table.patientDiagnosisTable.statusId, StatusEnum.DELETED)
				)
			),
		// Documents: patient documents joined to patients scoped to hospital (non-deleted)
		db
			.select({ count: count() })
			.from(table.patientDocumentTable)
			.innerJoin(
				table.patientTable,
				eq(
					table.patientDocumentTable.patientId,
					table.patientTable.id
				)
			)
			.where(
				and(
					eq(table.patientTable.hospitalId, hospitalId),
					ne(table.patientDocumentTable.statusId, StatusEnum.DELETED)
				)
			),
		// All visits for this hospital (we'll aggregate last 7 days)
		db
			.select({
				createdAt: table.patientVisitTable.createdAt
			})
			.from(table.patientVisitTable)
			.where(eq(table.patientVisitTable.hospitalId, hospitalId))
	]);

	// Doctors: distinct staff with at least one ACTIVE schedule in this hospital
	const activeDoctorIds = new Set(
		doctorScheduleRows
			.filter((row) => row.statusId === StatusEnum.ACTIVE)
			.map((row) => String(row.staffId))
	);
	const doctors = activeDoctorIds.size;

	// Patients
	const patients = patientCountRows[0]?.count ?? 0;

	// Appointments today (based on appointmentDate's date part, excluding DELETED)
	const todayStr = new Date().toISOString().slice(0, 10);
	const todayAppointments = appointmentRows.filter((row) => {
		if (row.statusId === StatusEnum.DELETED) return false;
		const d = row.appointmentDate;
		if (!d) return false;
		return String(d).slice(0, 10) === todayStr;
	});
	const appointmentsToday = todayAppointments.length;

	// Check-in ratio to confirm: today's appointments with statusTaggingId 2=confirmed, 3=check_in
	const confirmedId = 2;
	const checkInId = 3;
	let checkedIn = 0;
	let confirmed = 0;
	for (const row of todayAppointments) {
		const tagId = row.statusTaggingId;
		if (tagId === checkInId) checkedIn += 1;
		if (tagId === confirmedId) confirmed += 1;
	}
	const checkInRatio: CheckInRatio = { checkedIn, confirmed };

	// Case history (diagnosis records)
	const caseHistory = caseHistoryCountRows[0]?.count ?? 0;

	// Documents
	const documents = documentCountRows[0]?.count ?? 0;

	// Visits last 7 days series (including today)
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const last7Days: DailyVisitCount[] = [];
	for (let i = 6; i >= 0; i--) {
		const d = new Date(today);
		d.setDate(today.getDate() - i);
		const key = d.toISOString().slice(0, 10);
		last7Days.push({ date: key, count: 0 });
	}

	const visitsByDate = new Map(last7Days.map((d) => [d.date, d]));
	for (const row of visitRows) {
		const createdAt = row.createdAt;
		if (!createdAt) continue;
		const key = new Date(createdAt).toISOString().slice(0, 10);
		const bucket = visitsByDate.get(key);
		if (bucket) bucket.count += 1;
	}

	const visitsLast7Days = last7Days;
	const visitsLast7DaysTotal = visitsLast7Days.reduce(
		(sum, d) => sum + d.count,
		0
	);

	const stats: DashboardStats = {
		doctors,
		patients,
		appointmentsToday,
		prescriptions: null, // Not implemented yet
		caseHistory,
		documents,
		invoices: null, // Not implemented yet
		unbill: null, // Not implemented yet
		checkInRatio,
		visitsLast7DaysTotal
	};

	return {
		stats,
		visitsLast7Days
	};
};
