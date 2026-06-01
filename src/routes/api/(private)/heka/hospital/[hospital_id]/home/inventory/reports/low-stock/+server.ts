import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseMariTableColumnFilters } from '$lib/tool/mari/mari-table-query.util';
import { listLowStock } from '$lib/server/heka/inventory/stock-alerts.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const sp = event.url.searchParams;
	const storeIdStr = sp.get('storeId');
	const limitStr = sp.get('limit');
	const storeId =
		storeIdStr != null && storeIdStr !== ''
			? Number(storeIdStr)
			: undefined;
	const limit =
		limitStr != null && limitStr !== ''
			? Number(limitStr)
			: undefined;

	const rows = await listLowStock(event, {
		hospitalId,
		storeId:
			typeof storeId === 'number' && Number.isFinite(storeId)
				? storeId
				: undefined,
		columnFilters: parseMariTableColumnFilters(sp),
		limit:
			typeof limit === 'number' && Number.isFinite(limit)
				? limit
				: undefined
	});

	return json(rows);
};
