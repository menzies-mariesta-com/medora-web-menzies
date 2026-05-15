import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listInventoryMovement } from '$lib/server/heka/inventory/stock-reports.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const storeIdStr = event.url.searchParams.get('storeId');
	const limitStr = event.url.searchParams.get('limit');
	const storeId =
		storeIdStr != null && storeIdStr !== ''
			? Number(storeIdStr)
			: undefined;
	const limit =
		limitStr != null && limitStr !== ''
			? Number(limitStr)
			: undefined;

	const rows = await listInventoryMovement(event, {
		hospitalId,
		storeId:
			typeof storeId === 'number' && Number.isFinite(storeId)
				? storeId
				: undefined,
		limit:
			typeof limit === 'number' && Number.isFinite(limit)
				? limit
				: undefined
	});
	return json(rows);
};
