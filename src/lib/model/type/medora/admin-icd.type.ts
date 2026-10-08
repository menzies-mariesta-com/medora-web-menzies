import type { DiagnosisCodingSystem } from '$lib/model/enum/diagnosis-coding-system.enum';

export type AdminIcdCodeRow = {
	id: number;
	code: string;
	system: string;
	description: string;
	releaseId: string | null;
	statusId: number;
	createdAt: string | null;
	updatedAt: string | null;
};

export type AdminIcdReleaseSummary = {
	system: string;
	releaseId: string;
	source: string;
	titleCount: number;
	importedAt: string | null;
};

export type AdminIcdSystemTotals = Record<DiagnosisCodingSystem, number>;

export type AdminIcdListResponse = {
	data: AdminIcdCodeRow[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	system: string;
	systemTotals: AdminIcdSystemTotals;
	latestReleases: AdminIcdReleaseSummary[];
};

export type AdminIcdReseedSystemResult = {
	system: string;
	inserted: number;
	updated: number;
	total: number;
};

export type AdminIcdReseedResponse = {
	systems: AdminIcdReseedSystemResult[];
	inserted: number;
	updated: number;
	total: number;
};
