import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	deleteReorderLevel,
	getReorderLevelLookups,
	listReorderLevels,
	upsertReorderLevel
} from '$lib/server/medora/inventory/reorder-level.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const mode = event.url.searchParams.get('mode') ?? 'list';
	if (mode === 'lookups') {
		return json(await getReorderLevelLookups(event, { hospitalId }));
	}

	const storeIdStr = event.url.searchParams.get('storeId');
	const q = event.url.searchParams.get('q') ?? undefined;
	const limitStr = event.url.searchParams.get('limit');
	const storeId =
		storeIdStr != null && storeIdStr !== ''
			? Number(storeIdStr)
			: undefined;
	const limit =
		limitStr != null && limitStr !== ''
			? Number(limitStr)
			: undefined;

	const rows = await listReorderLevels(event, {
		hospitalId,
		storeId:
			typeof storeId === 'number' && Number.isFinite(storeId)
				? storeId
				: undefined,
		q,
		limit:
			typeof limit === 'number' && Number.isFinite(limit)
				? limit
				: undefined
	});
	return json(rows);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Invalid JSON body');
	const replaceRaw = body.replaceRowId ?? body.id;
	let replaceRowId: number | undefined;
	if (replaceRaw != null && replaceRaw !== '') {
		const n = Number(replaceRaw);
		if (!Number.isFinite(n) || n <= 0)
			throw error(400, 'Invalid replace row id');
		replaceRowId = n;
	}
	const row = await upsertReorderLevel(event, {
		hospitalId,
		storeId: Number(body.storeId ?? 0),
		itemId: Number(body.itemId ?? 0),
		itemUnitMasterId: Number(body.itemUnitMasterId ?? 0),
		minQtyPurchase: body.minQtyPurchase,
		replaceRowId
	});
	return json(row);
};

export const PUT: RequestHandler = POST;

export const DELETE: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Invalid JSON body');
	const id = Number(body.id ?? 0);
	if (!Number.isFinite(id) || id <= 0)
		throw error(400, 'id is required');
	await deleteReorderLevel(event, { hospitalId, id });
	return json({ ok: true });
};
