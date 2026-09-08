import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseMenziesTableColumnFilters } from '$lib/tool/menzies/menzies-table-query.util';
import { listExpiryLots } from '$lib/server/medora/inventory/stock-alerts.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const sp = event.url.searchParams;
	const storeIdStr = sp.get('storeId');
	const limitStr = sp.get('limit');
	const mode =
		sp.get('mode') === 'expired' ? 'expired' : 'expiringSoon';
	const daysSoonStr = sp.get('daysSoon');

	const storeId =
		storeIdStr != null && storeIdStr !== ''
			? Number(storeIdStr)
			: undefined;
	const limit =
		limitStr != null && limitStr !== ''
			? Number(limitStr)
			: undefined;
	const daysSoon =
		daysSoonStr != null && daysSoonStr !== ''
			? Number(daysSoonStr)
			: undefined;

	const rows = await listExpiryLots(event, {
		hospitalId,
		storeId:
			typeof storeId === 'number' && Number.isFinite(storeId)
				? storeId
				: undefined,
		mode,
		daysSoon:
			typeof daysSoon === 'number' && Number.isFinite(daysSoon)
				? daysSoon
				: undefined,
		columnFilters: parseMenziesTableColumnFilters(sp),
		limit:
			typeof limit === 'number' && Number.isFinite(limit)
				? limit
				: undefined
	});

	return json(rows);
};
