import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createPurchaseRequisition,
	getPurchaseRequisitionById,
	listPurchaseRequisitions,
	updatePurchaseRequisition
} from '$lib/server/heka/inventory/pr.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const id = event.url.searchParams.get('id');
	if (id) {
		const row = await getPurchaseRequisitionById(event, { hospitalId, id });
		return json(row);
	}
	const mode = event.url.searchParams.get('mode');
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const storeIdStr = event.url.searchParams.get('storeId');
	const storeId =
		storeIdStr != null && storeIdStr !== ''
			? Number(storeIdStr)
			: undefined;
	const toStoreIdStr = event.url.searchParams.get('toStoreId');
	const toStoreId =
		toStoreIdStr != null && toStoreIdStr !== ''
			? Number(toStoreIdStr)
			: undefined;
	const statusIdStr = event.url.searchParams.get('statusTaggingId');
	const statusTaggingId =
		statusIdStr != null && statusIdStr !== ''
			? Number(statusIdStr)
			: undefined;
	const prNoRaw = event.url.searchParams.get('prNo');
	const prNo =
		prNoRaw != null && prNoRaw !== '' ? prNoRaw : undefined;
	const itemRaw = event.url.searchParams.get('item');
	const item =
		itemRaw != null && itemRaw !== '' ? itemRaw : undefined;
	const data = await listPurchaseRequisitions(event, {
		hospitalId,
		page,
		pageSize,
		storeId,
		toStoreId: Number.isFinite(toStoreId as number) ? toStoreId : undefined,
		statusTaggingId: Number.isFinite(statusTaggingId as number)
			? statusTaggingId
			: undefined,
		prNo,
		item,
		onlyWithRemainingQty: mode === 'poEligible'
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const lines = (body.lines as Record<string, unknown>[]) ?? [];
	const data = await createPurchaseRequisition(event, {
		hospitalId,
		fromStoreId: Number(body.fromStoreId ?? 0),
		toStoreId: Number(body.toStoreId ?? 0),
		remarks: body.remarks != null ? String(body.remarks) : null,
		lines: lines.map((l) => ({
			itemId: Number(l.itemId ?? 0),
			quantity: String(l.quantity ?? '0'),
			unitId: Number(l.unitId ?? 0)
		}))
	});
	return json(data);
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const linesRaw = body.lines as Record<string, unknown>[] | undefined;
	const data = await updatePurchaseRequisition(event, {
		hospitalId,
		id: String(body.id ?? ''),
		fromStoreId:
			body.fromStoreId !== undefined
				? Number(body.fromStoreId)
				: undefined,
		toStoreId:
			body.toStoreId !== undefined ? Number(body.toStoreId) : undefined,
		remarks:
			body.remarks !== undefined
				? body.remarks == null
					? null
					: String(body.remarks)
				: undefined,
		lines: linesRaw?.map((l) => ({
			itemId: Number(l.itemId ?? 0),
			quantity: String(l.quantity ?? '0'),
			unitId: Number(l.unitId ?? 0)
		}))
	});
	return json(data);
};
