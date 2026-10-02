import type { RequestEvent } from '@sveltejs/kit';
import {
	and,
	count,
	eq,
	gte,
	inArray,
	isNotNull,
	isNull,
	lt,
	lte,
	ne,
	sql,
	type SQL
} from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	BillingStatusTaggingEnum,
	InvPoStatusTaggingEnum,
	InvPrStatusTaggingEnum,
	IpdAdmissionStatusEnum,
	RoleEnum,
	StatusEnum,
	VisitTypeEnum
} from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { evaluateStockAlertsForHospital } from '$lib/server/medora/inventory/stock-alerts.server';
import { getStaffIdForUser } from '$lib/server/medora/inventory/inventory-scope.server';
import type {
	HospitalHomeDailyVisitCount,
	HospitalHomeDashboardFilters,
	HospitalHomeDashboardPayload,
	HospitalHomeDashboardStats
} from '$lib/model/type/medora/hospital-home-dashboard.type';

/** Matches home layout “All Branches” sentinel. */
export const HOSPITAL_HOME_BRANCH_ALL = '__all__';

const COOKIE_SELECTED_BRANCH_ID = 'heka_selected_branch_id';

const OPEN_PR_STATUSES = [
	InvPrStatusTaggingEnum.DRAFT,
	InvPrStatusTaggingEnum.PENDING,
	InvPrStatusTaggingEnum.SENT_BACK
] as const;

const OPEN_PO_STATUSES = [
	InvPoStatusTaggingEnum.DRAFT,
	InvPoStatusTaggingEnum.PENDING,
	InvPoStatusTaggingEnum.SENT_BACK,
	InvPoStatusTaggingEnum.APPROVED,
	InvPoStatusTaggingEnum.SENT_TO_SUPPLIER,
	InvPoStatusTaggingEnum.PARTIALLY_RECEIVED
] as const;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayISODate(): string {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d.toISOString().slice(0, 10);
}

function addDaysISO(iso: string, delta: number): string {
	const d = new Date(`${iso}T00:00:00.000Z`);
	d.setUTCDate(d.getUTCDate() + delta);
	return d.toISOString().slice(0, 10);
}

/** Default inclusive window: last 7 calendar days ending today. */
export function defaultHospitalHomeDateRange(): {
	dateFrom: string;
	dateTo: string;
} {
	const dateTo = todayISODate();
	return { dateFrom: addDaysISO(dateTo, -6), dateTo };
}

/**
 * Parses `dates=YYYY-MM-DD/YYYY-MM-DD` (or separate from/to) into a valid inclusive range.
 * Invalid / incomplete values fall back to the default 7-day window.
 */
export function parseHospitalHomeDateRange(input: {
	dates?: string | null;
	dateFrom?: string | null;
	dateTo?: string | null;
}): HospitalHomeDashboardFilters {
	const fallback = defaultHospitalHomeDateRange();
	let from = (input.dateFrom ?? '').trim();
	let to = (input.dateTo ?? '').trim();
	const combined = (input.dates ?? '').trim();
	if (combined.includes('/')) {
		const [a = '', b = ''] = combined.split('/');
		from = a.trim();
		to = b.trim();
	}
	if (!ISO_DATE_RE.test(from) || !ISO_DATE_RE.test(to)) {
		return {
			dateFrom: fallback.dateFrom,
			dateTo: fallback.dateTo,
			dates: `${fallback.dateFrom}/${fallback.dateTo}`
		};
	}
	if (from > to) {
		const swap = from;
		from = to;
		to = swap;
	}
	return { dateFrom: from, dateTo: to, dates: `${from}/${to}` };
}

function branchWhere(
	branchColumn: AnyPgColumn,
	branchIds: string[]
): SQL {
	if (branchIds.length === 0) return sql`false`;
	if (branchIds.length === 1) return eq(branchColumn, branchIds[0]!);
	return inArray(branchColumn, branchIds);
}

function rangeStartIso(dateFrom: string): string {
	return `${dateFrom}T00:00:00.000Z`;
}

/** Exclusive end: day after dateTo at 00:00 UTC. */
function rangeEndExclusiveIso(dateTo: string): string {
	return `${addDaysISO(dateTo, 1)}T00:00:00.000Z`;
}

function emptyStats(): HospitalHomeDashboardStats {
	return {
		doctors: 0,
		appointmentsInRange: 0,
		visitsInRange: 0,
		opVisitsInRange: 0,
		newPatientsInRange: 0,
		admissionsInRange: 0,
		ipCensus: 0,
		openBills: 0,
		closedBillsInRange: 0,
		lowStock: 0,
		openPrs: 0,
		openPos: 0,
		checkInRatio: { checkedIn: 0, confirmed: 0 }
	};
}

function buildVisitsByDayBuckets(
	dateFrom: string,
	dateTo: string
): HospitalHomeDailyVisitCount[] {
	const buckets: HospitalHomeDailyVisitCount[] = [];
	let cursor = dateFrom;
	while (cursor <= dateTo) {
		buckets.push({ date: cursor, count: 0 });
		cursor = addDaysISO(cursor, 1);
		if (buckets.length > 366) break;
	}
	return buckets;
}

function resolveBranchIdsForScope(input: {
	selectedBranchId: string | null;
	allowedBranches: { id: string; name: string | null }[];
}): { branchIds: string[]; scopeLabel: string | null } {
	const { selectedBranchId, allowedBranches } = input;
	if (allowedBranches.length === 0) {
		return { branchIds: [], scopeLabel: null };
	}
	if (selectedBranchId === HOSPITAL_HOME_BRANCH_ALL) {
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

/**
 * Resolves branch scope from session cookies (same semantics as home layout nav).
 */
export async function resolveHospitalHomeBranchScope(
	event: RequestEvent,
	hospitalId: string
): Promise<{
	branchIds: string[];
	scopeLabel: string | null;
	allowedBranches: { id: string; name: string | null }[];
	selectedBranchId: string | null;
}> {
	await ensureCanAccessHospital(event, hospitalId);
	const userRoleId = event.locals.userRoleId ?? null;
	const userId = event.locals.user?.id ?? null;
	const cookie = event.cookies.get(COOKIE_SELECTED_BRANCH_ID) ?? null;

	if (
		userRoleId === RoleEnum.SYSTEM_ADMIN ||
		userRoleId === RoleEnum.OWNER
	) {
		const allHospitalBranches = await ensureDb()
			.select({
				id: table.hospitalBranchTable.id,
				name: table.hospitalBranchTable.name
			})
			.from(table.hospitalBranchTable)
			.where(eq(table.hospitalBranchTable.hospitalId, hospitalId))
			.orderBy(table.hospitalBranchTable.name);
		const branchIds = allHospitalBranches.map((b) => b.id);
		const selectedBranchId =
			allHospitalBranches.length > 0 &&
			cookie != null &&
			(cookie === HOSPITAL_HOME_BRANCH_ALL || branchIds.includes(cookie))
				? cookie
				: allHospitalBranches.length > 0
					? HOSPITAL_HOME_BRANCH_ALL
					: null;
		const resolved = resolveBranchIdsForScope({
			selectedBranchId,
			allowedBranches: allHospitalBranches
		});
		return {
			...resolved,
			allowedBranches: allHospitalBranches,
			selectedBranchId
		};
	}

	if (userRoleId === RoleEnum.STAFF && userId) {
		const staffId = await getStaffIdForUser(userId);
		if (!staffId) {
			return {
				branchIds: [],
				scopeLabel: null,
				allowedBranches: [],
				selectedBranchId: null
			};
		}
		const staffBranchesRaw = await ensureDb()
			.select({
				id: table.hospitalBranchTable.id,
				name: table.hospitalBranchTable.name
			})
			.from(table.staffBranchTable)
			.innerJoin(
				table.hospitalBranchTable,
				eq(
					table.staffBranchTable.branchId,
					table.hospitalBranchTable.id
				)
			)
			.where(
				and(
					eq(table.staffBranchTable.staffId, staffId),
					eq(table.hospitalBranchTable.hospitalId, hospitalId)
				)
			)
			.orderBy(table.hospitalBranchTable.name);
		const allowedBranches = [
			...new Map(staffBranchesRaw.map((b) => [b.id, b])).values()
		];
		const allHospitalBranches = await ensureDb()
			.select({ id: table.hospitalBranchTable.id })
			.from(table.hospitalBranchTable)
			.where(eq(table.hospitalBranchTable.hospitalId, hospitalId));
		const allIds = allHospitalBranches.map((b) => b.id);
		const staffSet = new Set(allowedBranches.map((b) => b.id));
		const hasAll =
			allIds.length > 0 && allIds.every((id) => staffSet.has(id));
		const navIds = hasAll
			? [HOSPITAL_HOME_BRANCH_ALL, ...allowedBranches.map((b) => b.id)]
			: allowedBranches.map((b) => b.id);
		const selectedBranchId =
			allowedBranches.length === 1
				? allowedBranches[0]!.id
				: cookie != null && navIds.includes(cookie)
					? cookie
					: (navIds[0] ?? null);
		const resolved = resolveBranchIdsForScope({
			selectedBranchId,
			allowedBranches
		});
		return {
			...resolved,
			allowedBranches,
			selectedBranchId
		};
	}

	return {
		branchIds: [],
		scopeLabel: null,
		allowedBranches: [],
		selectedBranchId: null
	};
}

export async function loadHospitalHomeDashboard(input: {
	hospitalId: string;
	branchIds: string[];
	branchScopeName: string | null;
	filters: HospitalHomeDashboardFilters;
}): Promise<HospitalHomeDashboardPayload> {
	const { hospitalId, branchIds, branchScopeName, filters } = input;
	const visitsByDay = buildVisitsByDayBuckets(
		filters.dateFrom,
		filters.dateTo
	);

	if (!hospitalId || branchIds.length === 0) {
		return {
			stats: emptyStats(),
			visitsByDay,
			filters,
			branchScopeName: null
		};
	}

	const db = ensureDb();
	const ds = table.doctorScheduleTable;
	const apt = table.appointmentTable;
	const pv = table.patientVisitTable;
	const p = table.patientTable;
	const adm = table.ipdAdmissionTable;
	const opBill = table.opBillingTable;
	const ipBill = table.ipBillingTable;
	const pr = table.purchaseRequisitionTable;
	const po = table.purchaseOrderTable;
	const store = table.storeTable;

	const branchClausePv = branchWhere(pv.branchId, branchIds);
	const branchClauseDs = branchWhere(ds.branchId, branchIds);
	const branchClauseApt = branchWhere(apt.branchId, branchIds);
	const branchClauseAdm = branchWhere(adm.branchId, branchIds);
	const branchClauseOpBill = branchWhere(opBill.branchId, branchIds);
	const branchClauseIpBill = branchWhere(ipBill.branchId, branchIds);

	const startTs = rangeStartIso(filters.dateFrom);
	const endExclusiveTs = rangeEndExclusiveIso(filters.dateTo);

	const activeVisitPredicate = and(
		eq(pv.hospitalId, hospitalId),
		eq(pv.statusId, StatusEnum.ACTIVE),
		branchClausePv
	);

	const storeRows = await db
		.select({ id: store.id })
		.from(store)
		.where(
			and(
				inArray(store.branchId, branchIds),
				ne(store.statusId, StatusEnum.DELETED)
			)
		);
	const storeIds = storeRows.map((r) => r.id);

	const [
		doctorRow,
		appointmentsRow,
		appointmentTagRows,
		visitRows,
		opVisitRow,
		newPatientRow,
		admissionsRow,
		ipCensusRow,
		openOpBillRow,
		openIpBillRow,
		closedOpBillRow,
		closedIpBillRow,
		openPrRow,
		openPoRow,
		stockEval
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
			.select({ n: count() })
			.from(apt)
			.where(
				and(
					eq(apt.hospitalId, hospitalId),
					eq(apt.statusId, StatusEnum.ACTIVE),
					branchClauseApt,
					gte(apt.appointmentDate, filters.dateFrom),
					lte(apt.appointmentDate, filters.dateTo)
				)
			),
		db
			.select({ statusTaggingId: apt.statusTaggingId })
			.from(apt)
			.where(
				and(
					eq(apt.hospitalId, hospitalId),
					eq(apt.statusId, StatusEnum.ACTIVE),
					branchClauseApt,
					gte(apt.appointmentDate, filters.dateFrom),
					lte(apt.appointmentDate, filters.dateTo)
				)
			),
		db
			.select({ createdAt: pv.createdAt })
			.from(pv)
			.where(
				and(
					activeVisitPredicate,
					isNotNull(pv.createdAt),
					gte(pv.createdAt, startTs),
					lt(pv.createdAt, endExclusiveTs)
				)
			),
		db
			.select({ n: count() })
			.from(pv)
			.where(
				and(
					activeVisitPredicate,
					eq(pv.visitTypeId, VisitTypeEnum.OPD),
					isNotNull(pv.createdAt),
					gte(pv.createdAt, startTs),
					lt(pv.createdAt, endExclusiveTs)
				)
			),
		db
			.select({ n: count() })
			.from(p)
			.where(
				and(
					eq(p.hospitalId, hospitalId),
					ne(p.statusId, StatusEnum.DELETED),
					isNotNull(p.createdAt),
					gte(p.createdAt, startTs),
					lt(p.createdAt, endExclusiveTs)
				)
			),
		db
			.select({ n: count() })
			.from(adm)
			.where(
				and(
					eq(adm.hospitalId, hospitalId),
					ne(adm.statusId, StatusEnum.DELETED),
					branchClauseAdm,
					gte(adm.admittedAt, startTs),
					lt(adm.admittedAt, endExclusiveTs)
				)
			),
		db
			.select({ n: count() })
			.from(adm)
			.where(
				and(
					eq(adm.hospitalId, hospitalId),
					ne(adm.statusId, StatusEnum.DELETED),
					eq(adm.admissionStatus, IpdAdmissionStatusEnum.ADMITTED),
					branchClauseAdm
				)
			),
		db
			.select({ n: count() })
			.from(opBill)
			.where(
				and(
					eq(opBill.hospitalId, hospitalId),
					eq(opBill.statusId, StatusEnum.ACTIVE),
					eq(opBill.statusTaggingId, BillingStatusTaggingEnum.OPEN),
					branchClauseOpBill
				)
			),
		db
			.select({ n: count() })
			.from(ipBill)
			.where(
				and(
					eq(ipBill.hospitalId, hospitalId),
					eq(ipBill.statusId, StatusEnum.ACTIVE),
					eq(ipBill.statusTaggingId, BillingStatusTaggingEnum.OPEN),
					branchClauseIpBill
				)
			),
		db
			.select({ n: count() })
			.from(opBill)
			.where(
				and(
					eq(opBill.hospitalId, hospitalId),
					eq(opBill.statusId, StatusEnum.ACTIVE),
					eq(opBill.statusTaggingId, BillingStatusTaggingEnum.CLOSED),
					branchClauseOpBill,
					gte(opBill.updatedAt, startTs),
					lt(opBill.updatedAt, endExclusiveTs)
				)
			),
		db
			.select({ n: count() })
			.from(ipBill)
			.where(
				and(
					eq(ipBill.hospitalId, hospitalId),
					eq(ipBill.statusId, StatusEnum.ACTIVE),
					eq(ipBill.statusTaggingId, BillingStatusTaggingEnum.CLOSED),
					branchClauseIpBill,
					gte(ipBill.updatedAt, startTs),
					lt(ipBill.updatedAt, endExclusiveTs)
				)
			),
		storeIds.length === 0
			? Promise.resolve([{ n: 0 }])
			: db
					.select({ n: count() })
					.from(pr)
					.where(
						and(
							eq(pr.hospitalId, hospitalId),
							isNull(pr.deletedAt),
							inArray(pr.fromStoreId, storeIds),
							inArray(pr.statusTaggingId, [...OPEN_PR_STATUSES])
						)
					),
		storeIds.length === 0
			? Promise.resolve([{ n: 0 }])
			: db
					.select({ n: count() })
					.from(po)
					.where(
						and(
							eq(po.hospitalId, hospitalId),
							isNull(po.deletedAt),
							inArray(po.storeId, storeIds),
							inArray(po.statusTaggingId, [...OPEN_PO_STATUSES])
						)
					),
		evaluateStockAlertsForHospital(null, {
			hospitalId,
			storeIdsInScope: storeIds
		}).catch(() => ({
			summary: {
				lowStockCount: 0,
				expiredLotCount: 0,
				expiringSoonLotCount: 0
			},
			settings: null,
			baselineSoon: 30
		}))
	]);

	const visitsByDate = new Map(visitsByDay.map((x) => [x.date, x]));
	for (const row of visitRows) {
		const createdAt = row.createdAt;
		if (!createdAt) continue;
		const key = new Date(createdAt).toISOString().slice(0, 10);
		const bucket = visitsByDate.get(key);
		if (bucket) bucket.count += 1;
	}

	const confirmedId = 2;
	const checkInId = 3;
	let checkedIn = 0;
	let confirmed = 0;
	for (const row of appointmentTagRows) {
		const tagId = row.statusTaggingId;
		if (tagId === checkInId) checkedIn += 1;
		if (tagId === confirmedId) confirmed += 1;
	}

	const visitsInRange = visitsByDay.reduce((sum, d) => sum + d.count, 0);
	const stats: HospitalHomeDashboardStats = {
		doctors: Number(doctorRow[0]?.n ?? 0),
		appointmentsInRange: Number(appointmentsRow[0]?.n ?? 0),
		visitsInRange,
		opVisitsInRange: Number(opVisitRow[0]?.n ?? 0),
		newPatientsInRange: Number(newPatientRow[0]?.n ?? 0),
		admissionsInRange: Number(admissionsRow[0]?.n ?? 0),
		ipCensus: Number(ipCensusRow[0]?.n ?? 0),
		openBills:
			Number(openOpBillRow[0]?.n ?? 0) + Number(openIpBillRow[0]?.n ?? 0),
		closedBillsInRange:
			Number(closedOpBillRow[0]?.n ?? 0) +
			Number(closedIpBillRow[0]?.n ?? 0),
		lowStock: stockEval.summary.lowStockCount,
		openPrs: Number(openPrRow[0]?.n ?? 0),
		openPos: Number(openPoRow[0]?.n ?? 0),
		checkInRatio: { checkedIn, confirmed }
	};

	return {
		stats,
		visitsByDay,
		filters,
		branchScopeName
	};
}

/**
 * Loads dashboard using layout-style branch scope from parent data.
 */
export function resolveBranchIdsFromParent(parent: {
	selectedBranchId: string | null;
	allowedBranches: { id: string; name: string | null }[];
}): { branchIds: string[]; scopeLabel: string | null } {
	return resolveBranchIdsForScope(parent);
}
