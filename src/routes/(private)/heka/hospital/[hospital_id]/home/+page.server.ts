import type { PageServerLoad } from './$types';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { and, count, eq, inArray, ne, sql, gte, lt, isNotNull, type SQL } from 'drizzle-orm';

/** Matches `home/+layout.server.ts` “All Branches” sentinel. */
const BRANCH_ALL_VALUE = '__all__';

type DailyVisitCount = {
	date: string; // YYYY-MM-DD
	count: number;
};

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

type ParentLayoutData = {
	selectedBranchId: string | null;
	allowedBranches: { id: string; name: string | null }[];
};

/**
 * Resolves which branch UUIDs the dashboard should aggregate for the current session.
 * - One branch: that id only.
 * - “All branches” (where applicable): all ids the user is allowed to use for this hospital.
 * - null / invalid cookie: first allowed branch (matches nav behaviour).
 */
function resolveBranchIdsForScope(
	parent: ParentLayoutData
): { branchIds: string[]; scopeLabel: string | null } {
	const { selectedBranchId, allowedBranches } = parent;
	if (allowedBranches.length === 0) {
		return { branchIds: [], scopeLabel: null };
	}
	if (selectedBranchId === BRANCH_ALL_VALUE) {
		return {
			branchIds: allowedBranches.map((b) => b.id),
			scopeLabel: 'All branches'
		};
	}
	if (
		selectedBranchId != null &&
		allowedBranches.some((b) => b.id === selectedBranchId)
	) {
		const b = allowedBranches.find((x) => x.id === selectedBranchId);
		return {
			branchIds: [selectedBranchId],
			scopeLabel: b?.name?.trim() || null
		};
	}
	const first = allowedBranches[0]!;
	return {
		branchIds: [first.id],
		scopeLabel: first.name?.trim() || null
	};
}

function branchWhere(
	branchColumn: typeof table.patientVisitTable.branchId,
	branchIds: string[]
): SQL {
	if (branchIds.length === 0) {
		return sql`false`;
	}
	if (branchIds.length === 1) {
		return eq(branchColumn, branchIds[0]!);
	}
	return inArray(branchColumn, branchIds);
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const hospitalId = params.hospital_id;
	if (!hospitalId) {
		return {
			stats: null,
			visitsLast7Days: [] as DailyVisitCount[],
			branchScopeName: null as string | null
		};
	}

	const parentData = (await parent()) as ParentLayoutData;
	const { branchIds, scopeLabel: branchScopeName } =
		resolveBranchIdsForScope(parentData);

	if (branchIds.length === 0) {
		const emptyStats: DashboardStats = {
			doctors: 0,
			patients: 0,
			appointmentsToday: 0,
			prescriptions: null,
			caseHistory: 0,
			documents: 0,
			invoices: null,
			unbill: null,
			checkInRatio: { checkedIn: 0, confirmed: 0 },
			visitsLast7DaysTotal: 0
		};
		const last7: DailyVisitCount[] = [];
		const t = new Date();
		t.setHours(0, 0, 0, 0);
		for (let i = 6; i >= 0; i--) {
			const d = new Date(t);
			d.setDate(t.getDate() - i);
			last7.push({ date: d.toISOString().slice(0, 10), count: 0 });
		}
		return { stats: emptyStats, visitsLast7Days: last7, branchScopeName: null };
	}

	const db = ensureDb();
	const todayStr = new Date().toISOString().slice(0, 10);

	const ds = table.doctorScheduleTable;
	const apt = table.appointmentTable;
	const pv = table.patientVisitTable;
	const p = table.patientTable;
	const pdx = table.patientDiagnosisTable;
	const pdoc = table.patientDocumentTable;

	const branchClausePv = branchWhere(pv.branchId, branchIds);
	const branchClauseDs = branchWhere(ds.branchId, branchIds);
	const branchClauseApt = branchWhere(apt.branchId, branchIds);

	// 7-day window (same local bucketing as before; pull a slightly wide range then bucket)
	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);
	const rangeStart = new Date(todayStart);
	rangeStart.setDate(rangeStart.getDate() - 6);
	const rangeEndExclusive = new Date(todayStart);
	rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);

	const activePatientPredicate = and(
		ne(p.statusId, StatusEnum.DELETED),
		eq(p.statusId, StatusEnum.ACTIVE)
	);
	const activeVisitPredicate = and(
		eq(pv.hospitalId, hospitalId),
		eq(pv.statusId, StatusEnum.ACTIVE),
		branchClausePv
	);

	const [
		doctorRow,
		patientRow,
		appointmentsTodayRow,
		appointmentTagRows,
		caseHistoryRow,
		documentRow,
		visitRows
	] = await Promise.all([
		db
			.select({ n: sql<number>`count(distinct ${ds.staffId})::int` })
			.from(ds)
			.where(
				and(
					eq(ds.hospitalId, hospitalId),
					eq(ds.statusId, StatusEnum.ACTIVE),
					branchClauseDs
				)
			),
		db
			.select({ n: sql<number>`count(distinct ${p.id})::int` })
			.from(p)
			.innerJoin(pv, eq(p.id, pv.patientId))
			.where(
				and(
					eq(p.hospitalId, hospitalId),
					activePatientPredicate,
					activeVisitPredicate
				)
			),
		db
			.select({ n: count() })
			.from(apt)
			.where(
				and(
					eq(apt.hospitalId, hospitalId),
					eq(apt.statusId, StatusEnum.ACTIVE),
					branchClauseApt,
					eq(apt.appointmentDate, todayStr)
				)
			),
		// today’s active appointments: tags for check-in / confirmed
		db
			.select({
				statusTaggingId: apt.statusTaggingId
			})
			.from(apt)
			.where(
				and(
					eq(apt.hospitalId, hospitalId),
					eq(apt.statusId, StatusEnum.ACTIVE),
					branchClauseApt,
					eq(apt.appointmentDate, todayStr)
				)
			),
		db
			.select({ n: count() })
			.from(pdx)
			.innerJoin(pv, eq(pdx.visitId, pv.id))
			.where(
				and(
					eq(pdx.hospitalId, hospitalId),
					eq(pdx.statusId, StatusEnum.ACTIVE),
					activeVisitPredicate
				)
			),
		db
			.select({ n: count() })
			.from(pdoc)
			.innerJoin(p, eq(pdoc.patientId, p.id))
			.innerJoin(pv, eq(pdoc.visitId, pv.id))
			.where(
				and(
					eq(p.hospitalId, hospitalId),
					eq(pdoc.statusId, StatusEnum.ACTIVE),
					activeVisitPredicate
				)
			),
		db
			.select({ createdAt: pv.createdAt })
			.from(pv)
			.where(
				and(
					activeVisitPredicate,
					isNotNull(pv.createdAt),
					gte(pv.createdAt, rangeStart.toISOString()),
					lt(pv.createdAt, rangeEndExclusive.toISOString())
				)
			)
	]);

	const doctors = Number(doctorRow[0]?.n ?? 0);
	const patients = Number(patientRow[0]?.n ?? 0);
	const appointmentsToday = Number(appointmentsTodayRow[0]?.n ?? 0);
	const caseHistory = Number(caseHistoryRow[0]?.n ?? 0);
	const documents = Number(documentRow[0]?.n ?? 0);

	const confirmedId = 2;
	const checkInId = 3;
	let checkedIn = 0;
	let confirmed = 0;
	for (const row of appointmentTagRows) {
		const tagId = row.statusTaggingId;
		if (tagId === checkInId) checkedIn += 1;
		if (tagId === confirmedId) confirmed += 1;
	}
	const checkInRatio: CheckInRatio = { checkedIn, confirmed };

	// Visits last 7 days (bucket by UTC date string, matching previous behaviour)
	const last7: DailyVisitCount[] = [];
	for (let i = 6; i >= 0; i--) {
		const d = new Date(todayStart);
		d.setDate(todayStart.getDate() - i);
		const key = d.toISOString().slice(0, 10);
		last7.push({ date: key, count: 0 });
	}
	const visitsByDate = new Map(last7.map((x) => [x.date, x]));
	for (const row of visitRows) {
		const createdAt = row.createdAt;
		if (!createdAt) continue;
		const key = new Date(createdAt).toISOString().slice(0, 10);
		const bucket = visitsByDate.get(key);
		if (bucket) bucket.count += 1;
	}
	const visitsLast7Days = last7;
	const visitsLast7DaysTotal = visitsLast7Days.reduce(
		(sum, d) => sum + d.count,
		0
	);

	const stats: DashboardStats = {
		doctors,
		patients,
		appointmentsToday,
		prescriptions: null,
		caseHistory,
		documents,
		invoices: null,
		unbill: null,
		checkInRatio,
		visitsLast7DaysTotal
	};

	return {
		stats,
		visitsLast7Days,
		branchScopeName
	};
};
