import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	listStockAggregated,
	listStockLots
} from '$lib/server/heka/inventory/stock.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const mode = event.url.searchParams.get('mode') ?? 'aggregated';
	const storeIdStr = event.url.searchParams.get('storeId');
	const itemIdStr = event.url.searchParams.get('itemId');
	const storeId =
		storeIdStr != null && storeIdStr !== ''
			? Number(storeIdStr)
			: undefined;
	const itemId =
		itemIdStr != null && itemIdStr !== ''
			? Number(itemIdStr)
			: undefined;
	if (mode === 'lots') {
		const rows = await listStockLots(event, {
			hospitalId,
			storeId,
			itemId
		});
		return json(
			rows.map(
				({ stock, batch, itemName, storeName, issueUnitName }) => ({
					...stock,
					batchNo: batch.batchNo,
					expiryDate: batch.expiryDate,
					purchasePrice: batch.purchasePrice,
					itemName,
					storeName,
					issueUnitName: issueUnitName ?? null
				})
			)
		);
	}
	const data = await listStockAggregated(event, {
		hospitalId,
		storeId,
		itemId
	});
	return json(data);
};
