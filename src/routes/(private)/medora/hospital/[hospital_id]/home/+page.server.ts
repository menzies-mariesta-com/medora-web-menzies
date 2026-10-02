import type { PageServerLoad } from './$types';
import {
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

	const payload = await loadHospitalHomeDashboard({
		hospitalId,
		branchIds,
		branchScopeName,
		filters
	});

	return payload;
};
