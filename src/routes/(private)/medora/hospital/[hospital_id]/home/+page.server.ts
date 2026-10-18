import type { PageServerLoad } from './$types';
import {
	defaultHospitalHomeDateRange,
	loadHospitalHomeDashboard,
	parseHospitalHomeDateRange,
	resolveBranchIdsFromParent
} from '$lib/server/medora/dashboard/hospital-home-dashboard.server';

type ParentLayoutData = {
	selectedBranchId: string | null;
	allowedBranches: { id: string; name: string | null }[];
};

export const load: PageServerLoad = async (event) => {
	const hospitalId = event.params.hospital_id;
	const filters = parseHospitalHomeDateRange({
		dates: event.url.searchParams.get('dates'),
		dateFrom: event.url.searchParams.get('dateFrom'),
		dateTo: event.url.searchParams.get('dateTo')
	});

	if (!hospitalId) {
		return {
			stats: null,
			visitsByDay: [],
			filters,
			branchScopeName: null as string | null
		};
	}

	const parentData = (await event.parent()) as ParentLayoutData;
	const { branchIds, scopeLabel: branchScopeName } =
		resolveBranchIdsFromParent(parentData);

	try {
		const payload = await loadHospitalHomeDashboard({
			hospitalId,
			branchIds,
			branchScopeName,
			filters
		});
		return payload;
	} catch (err) {
		console.error('[hospital-home load]', err);
		const fallbackRange = defaultHospitalHomeDateRange();
		return {
			stats: null,
			visitsByDay: [],
			filters: {
				...filters,
				dateFrom: filters.dateFrom || fallbackRange.dateFrom,
				dateTo: filters.dateTo || fallbackRange.dateTo,
				dates:
					filters.dates ||
					`${fallbackRange.dateFrom}/${fallbackRange.dateTo}`
			},
			branchScopeName,
			dashboardLoadError: true
		};
	}
};
