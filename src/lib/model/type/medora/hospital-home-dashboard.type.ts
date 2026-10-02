/** Daily visit bucket for the hospital home chart (`YYYY-MM-DD`). */
export type HospitalHomeDailyVisitCount = {
	date: string;
	count: number;
};

export type HospitalHomeCheckInRatio = {
	checkedIn: number;
	confirmed: number;
};

/**
 * Hospital home dashboard stats.
 * Period metrics respect the selected inclusive date range.
 * Snapshot metrics are current (branch-scoped) and ignore the date range.
 */
export type HospitalHomeDashboardStats = {
	/** Snapshot: distinct staff with active doctor schedules in scope. */
	doctors: number;
	/** Period: appointments with date in range. */
	appointmentsInRange: number;
	/** Period: active visits created in range. */
	visitsInRange: number;
	/** Period: OPD visits created in range. */
	opVisitsInRange: number;
	/** Period: patients first registered in range (hospital-wide). */
	newPatientsInRange: number;
	/** Period: IPD admissions with admittedAt in range. */
	admissionsInRange: number;
	/** Snapshot: currently admitted IPD patients. */
	ipCensus: number;
	/** Snapshot: open OP + IP bills (unbill). */
	openBills: number;
	/** Period: OP + IP bills closed in range. */
	closedBillsInRange: number;
	/** Snapshot: low-stock item rows in scoped stores. */
	lowStock: number;
	/** Snapshot: open PRs (draft / pending / sent back) in scoped stores. */
	openPrs: number;
	/** Snapshot: open POs (not closed / rejected) in scoped stores. */
	openPos: number;
	/** Period: check-in vs confirmed tags on appointments in range. */
	checkInRatio: HospitalHomeCheckInRatio;
};

export type HospitalHomeDashboardFilters = {
	/** Inclusive start `YYYY-MM-DD`. */
	dateFrom: string;
	/** Inclusive end `YYYY-MM-DD`. */
	dateTo: string;
	/** Combined Cally / Wash range value `YYYY-MM-DD/YYYY-MM-DD`. */
	dates: string;
};

export type HospitalHomeDashboardPayload = {
	stats: HospitalHomeDashboardStats;
	visitsByDay: HospitalHomeDailyVisitCount[];
	filters: HospitalHomeDashboardFilters;
	branchScopeName: string | null;
};
