import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStockAlertsSummaryAndNotify } from '$lib/server/medora/inventory/stock-alerts.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const storeIdStr = event.url.searchParams.get('storeId');
	const daysSoonStr = event.url.searchParams.get('daysSoon');
	const storeId =
		storeIdStr != null && storeIdStr !== ''
			? Number(storeIdStr)
			: undefined;
	const daysSoon =
		daysSoonStr != null && daysSoonStr !== ''
			? Number(daysSoonStr)
			: undefined;

	const data = await getStockAlertsSummaryAndNotify(event, {
		hospitalId,
		storeId:
			typeof storeId === 'number' && Number.isFinite(storeId)
				? storeId
				: undefined,
		daysSoon:
			typeof daysSoon === 'number' && Number.isFinite(daysSoon)
				? daysSoon
				: undefined
	});
	return json(data);
};
