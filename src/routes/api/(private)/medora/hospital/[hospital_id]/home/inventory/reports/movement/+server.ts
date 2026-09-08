import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { InventoryMovementKindFilter } from '$lib/model/type/medora/inventory-report.type';
import { parseMenziesTableColumnFilters } from '$lib/tool/menzies/menzies-table-query.util';
import { listInventoryMovement } from '$lib/server/medora/inventory/stock-reports.server';

function parseKind(
	raw: string | null
): InventoryMovementKindFilter | undefined {
	const k = raw?.trim().toUpperCase();
	if (!k || k === 'ALL') return 'all';
	if (k === 'GRN' || k === 'DISSUE' || k === 'DCONSUME') return k;
	return undefined;
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const sp = event.url.searchParams;
	const storeIdStr = sp.get('storeId');
	const itemIdStr = sp.get('itemId');
	const limitStr = sp.get('limit');
	const storeId =
		storeIdStr != null && storeIdStr !== ''
			? Number(storeIdStr)
			: undefined;
	const itemId =
		itemIdStr != null && itemIdStr !== ''
			? Number(itemIdStr)
			: undefined;
	const limit =
		limitStr != null && limitStr !== ''
			? Number(limitStr)
			: undefined;

	const columnFilters = parseMenziesTableColumnFilters(sp);
	const kindFromFilter = columnFilters.kind?.trim().toUpperCase();
	if (kindFromFilter === 'GRN' || kindFromFilter === 'DISSUE' || kindFromFilter === 'DCONSUME') {
		delete columnFilters.kind;
	}

	const rows = await listInventoryMovement(event, {
		hospitalId,
		storeId:
			typeof storeId === 'number' && Number.isFinite(storeId)
				? storeId
				: undefined,
		itemId:
			typeof itemId === 'number' && Number.isFinite(itemId)
				? itemId
				: undefined,
		kind:
			kindFromFilter === 'GRN' ||
			kindFromFilter === 'DISSUE' ||
			kindFromFilter === 'DCONSUME'
				? kindFromFilter
				: parseKind(sp.get('kind')),
		dateFrom: sp.get('dateFrom') ?? undefined,
		dateTo: sp.get('dateTo') ?? undefined,
		columnFilters,
		limit:
			typeof limit === 'number' && Number.isFinite(limit)
				? limit
				: undefined
	});

	return json(rows);
};
