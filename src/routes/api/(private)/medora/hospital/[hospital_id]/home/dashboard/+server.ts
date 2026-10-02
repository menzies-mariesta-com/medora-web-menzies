import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	loadHospitalHomeDashboard,
	parseHospitalHomeDateRange,
	resolveHospitalHomeBranchScope
} from '$lib/server/medora/dashboard/hospital-home-dashboard.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	if (!hospitalId) throw error(400, 'Hospital is required');

	const filters = parseHospitalHomeDateRange({
		dates: event.url.searchParams.get('dates'),
		dateFrom: event.url.searchParams.get('dateFrom'),
		dateTo: event.url.searchParams.get('dateTo')
	});

	const scope = await resolveHospitalHomeBranchScope(event, hospitalId);
	const payload = await loadHospitalHomeDashboard({
		hospitalId,
		branchIds: scope.branchIds,
		branchScopeName: scope.scopeLabel,
		filters
	});

	return json(payload);
};
