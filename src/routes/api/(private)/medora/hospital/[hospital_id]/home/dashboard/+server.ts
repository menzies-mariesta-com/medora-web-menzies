import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	defaultHospitalHomeDateRange,
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

	try {
		const scope = await resolveHospitalHomeBranchScope(event, hospitalId);
		const payload = await loadHospitalHomeDashboard({
			hospitalId,
			branchIds: scope.branchIds,
			branchScopeName: scope.scopeLabel,
			filters
		});
		return json(payload);
	} catch (err) {
		console.error('[hospital-home dashboard API]', err);
		const fallbackRange = defaultHospitalHomeDateRange();
		return json({
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
			branchScopeName: null,
			dashboardLoadError: true
		});
	}
};
