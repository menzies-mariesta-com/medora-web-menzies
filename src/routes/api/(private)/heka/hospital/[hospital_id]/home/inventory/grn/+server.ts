import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createAndPostDirectGoodsReceipt,
	createAndPostGoodsReceipt,
	getGoodsReceiptNoteById,
	getReceivingStoreForPurchaseOrder,
	listGoodsReceiptNotes
} from '$lib/server/heka/inventory/grn.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const mode = event.url.searchParams.get('mode');
	if (mode === 'receivingStoreForPo') {
		const poId = event.url.searchParams.get('poId');
		if (!poId) {
			return json({ error: 'poId required' }, { status: 400 });
		}
		const row = await getReceivingStoreForPurchaseOrder(event, {
			hospitalId,
			poId
		});
		return json(row);
	}
	const id = event.url.searchParams.get('id');
	if (id) {
		const row = await getGoodsReceiptNoteById(event, { hospitalId, id });
		return json(row);
	}
	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const poId = event.url.searchParams.get('poId') ?? undefined;
	const data = await listGoodsReceiptNotes(event, {
		hospitalId,
		page,
		pageSize,
		poId
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const lines = (body.lines as Record<string, unknown>[]) ?? [];
	if (body.mode === 'direct' || body.source === 'direct') {
		const data = await createAndPostDirectGoodsReceipt(event, {
			hospitalId,
			storeId: Number(body.storeId ?? 0),
			supplierId: Number(body.supplierId ?? 0),
			receivedDate: String(body.receivedDate ?? ''),
			lines: lines.map((l) => ({
				itemId: Number(l.itemId ?? 0),
				unitId: Number(l.unitId ?? 0),
				receivedQty: String(l.receivedQty ?? '0'),
				batchNo: l.batchNo != null ? String(l.batchNo) : null,
				expiryDate: l.expiryDate != null ? String(l.expiryDate) : null,
				purchasePrice:
					l.purchasePrice != null ? String(l.purchasePrice) : null
			}))
		});
		return json(data);
	}
	const data = await createAndPostGoodsReceipt(event, {
		hospitalId,
		poId: String(body.poId ?? ''),
		storeId: Number(body.storeId ?? 0),
		receivedDate: String(body.receivedDate ?? ''),
		lines: lines.map((l) => ({
			poLineId: Number(l.poLineId ?? 0),
			receivedQty: String(l.receivedQty ?? '0'),
			batchNo: l.batchNo != null ? String(l.batchNo) : null,
			expiryDate: l.expiryDate != null ? String(l.expiryDate) : null,
			purchasePrice:
				l.purchasePrice != null ? String(l.purchasePrice) : null
		}))
	});
	return json(data);
};
