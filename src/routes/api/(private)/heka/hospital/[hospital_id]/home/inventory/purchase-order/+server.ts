import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createPurchaseOrder,
	createPurchaseOrderDirect,
	getPurchaseOrderById,
	listPurchaseOrders
} from '$lib/server/heka/inventory/po.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const id = event.url.searchParams.get('id');
	if (id) {
		const row = await getPurchaseOrderById(event, { hospitalId, id });
		return json(row);
	}
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const prId = event.url.searchParams.get('prId') ?? undefined;
	const storeIdRaw = event.url.searchParams.get('storeId');
	const storeIdNum =
		storeIdRaw != null && storeIdRaw !== ''
			? Number(storeIdRaw)
			: NaN;
	const storeId =
		Number.isFinite(storeIdNum) && storeIdNum > 0
			? storeIdNum
			: undefined;
	const statusIdStr = event.url.searchParams.get('statusTaggingId');
	const statusTaggingId =
		statusIdStr != null && statusIdStr !== ''
			? Number(statusIdStr)
			: undefined;
	const poNoRaw = event.url.searchParams.get('poNo');
	const poNo =
		poNoRaw != null && poNoRaw !== '' ? poNoRaw : undefined;
	const data = await listPurchaseOrders(event, {
		hospitalId,
		page,
		pageSize,
		prId,
		...(storeId != null ? { storeId } : {}),
		statusTaggingId: Number.isFinite(statusTaggingId as number)
			? statusTaggingId
			: undefined,
		poNo
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const lines = (body.lines as Record<string, unknown>[]) ?? [];
	if (body.mode === 'direct' || body.source === 'direct') {
		const data = await createPurchaseOrderDirect(event, {
			hospitalId,
			storeId: Number(body.storeId ?? 0),
			supplierId: Number(body.supplierId ?? 0),
			lines: lines.map((l) => ({
				itemId: Number(l.itemId ?? 0),
				quantity: String(l.quantity ?? '0'),
				unitId: Number(l.unitId ?? 0),
				unitPrice: String(l.unitPrice ?? '0'),
				manufacturerId:
					l.manufacturerId === undefined || l.manufacturerId === null
						? null
						: Number(l.manufacturerId)
			}))
		});
		return json(data);
	}
	const data = await createPurchaseOrder(event, {
		hospitalId,
		storeId: Number(body.storeId ?? 0),
		prId: String(body.prId ?? ''),
		supplierId: Number(body.supplierId ?? 0),
		lines: lines.map((l) => ({
			prLineId: Number(l.prLineId ?? 0),
			itemId: Number(l.itemId ?? 0),
			quantity: String(l.quantity ?? '0'),
			unitId: Number(l.unitId ?? 0),
			unitPrice: String(l.unitPrice ?? '0'),
			manufacturerId:
				l.manufacturerId === undefined || l.manufacturerId === null
					? null
					: Number(l.manufacturerId)
		}))
	});
	return json(data);
};
