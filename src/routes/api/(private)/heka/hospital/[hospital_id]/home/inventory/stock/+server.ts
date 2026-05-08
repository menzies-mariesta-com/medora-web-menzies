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
	const itemIdsStr = event.url.searchParams.get('itemIds');
	const storeId =
		storeIdStr != null && storeIdStr !== ''
			? Number(storeIdStr)
			: undefined;
	const itemId =
		itemIdStr != null && itemIdStr !== ''
			? Number(itemIdStr)
			: undefined;
	const itemIds =
		itemIdsStr != null && itemIdsStr.trim() !== ''
			? itemIdsStr
					.split(',')
					.map((s) => Number(s.trim()))
					.filter((n) => Number.isFinite(n) && n > 0)
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
					salePrice: batch.salePrice,
					empSalePrice: batch.empSalePrice,
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
		itemId: itemIds != null && itemIds.length > 0 ? undefined : itemId,
		itemIds: itemIds != null && itemIds.length > 0 ? itemIds : undefined
	});
	return json(data);
};
