import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createAndPostDirectGoodsReceipt,
	createAndPostGoodsReceipt,
	canCurrentStaffPostGrn,
	getGoodsReceiptNoteById,
	getReceivingStoreForPurchaseOrder,
	listGoodsReceiptNotes
} from '$lib/server/heka/inventory/grn.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const mode = event.url.searchParams.get('mode');
	if (mode === 'canPost') {
		const storeIdStr = event.url.searchParams.get('storeId');
		const storeId = storeIdStr != null && storeIdStr !== '' ? Number(storeIdStr) : NaN;
		if (!Number.isFinite(storeId) || storeId <= 0) {
			return json({ error: 'storeId required' }, { status: 400 });
		}
		const canPost = await canCurrentStaffPostGrn(event, {
			hospitalId,
			storeId
		});
		return json({ canPost });
	}
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
	const invoiceNoRaw = event.url.searchParams.get('invoiceNo');
	const invoiceNo =
		invoiceNoRaw != null && invoiceNoRaw !== '' ? invoiceNoRaw : undefined;
	const data = await listGoodsReceiptNotes(event, {
		hospitalId,
		page,
		pageSize,
		poId,
		...(storeId != null ? { storeId } : {}),
		statusTaggingId: Number.isFinite(statusTaggingId as number)
			? statusTaggingId
			: undefined,
		poNo,
		invoiceNo
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const lines = (body.lines as Record<string, unknown>[]) ?? [];

	const invoiceNo =
		body.invoiceNo != null && String(body.invoiceNo).trim() !== ''
			? String(body.invoiceNo).trim()
			: null;
	const invoiceDate =
		body.invoiceDate != null && String(body.invoiceDate).trim() !== ''
			? String(body.invoiceDate).trim()
			: null;
	const invoiceAmount =
		body.invoiceAmount != null && String(body.invoiceAmount).trim() !== ''
			? String(body.invoiceAmount).trim()
			: null;
	const invoicePhotoUrl =
		body.invoicePhotoUrl != null && String(body.invoicePhotoUrl).trim() !== ''
			? String(body.invoicePhotoUrl).trim()
			: null;
	const receivedBy =
		body.receivedBy != null && String(body.receivedBy).trim() !== ''
			? String(body.receivedBy).trim()
			: null;

	// Basic validation (server module will also enforce invariants)
	if (invoiceDate) {
		// Expect YYYY-MM-DD; Date parse is permissive but good enough for guardrails.
		const t = Date.parse(invoiceDate);
		if (!Number.isFinite(t)) {
			return json({ error: 'Invalid invoiceDate' }, { status: 400 });
		}
	}
	if (invoiceAmount) {
		const n = Number(invoiceAmount);
		if (!Number.isFinite(n) || n < 0) {
			return json({ error: 'Invalid invoiceAmount' }, { status: 400 });
		}
	}

	if (body.mode === 'direct' || body.source === 'direct') {
		const data = await createAndPostDirectGoodsReceipt(event, {
			hospitalId,
			storeId: Number(body.storeId ?? 0),
			supplierId: Number(body.supplierId ?? 0),
			receivedDate: String(body.receivedDate ?? ''),
			invoiceNo,
			invoiceDate,
			invoiceAmount,
			invoicePhotoUrl,
			receivedBy,
			lines: lines.map((l) => ({
				itemId: Number(l.itemId ?? 0),
				unitId: Number(l.unitId ?? 0),
				receivedQty: String(l.receivedQty ?? '0'),
				batchNo: l.batchNo != null ? String(l.batchNo) : null,
				expiryDate: l.expiryDate != null ? String(l.expiryDate) : null,
				purchasePrice:
					l.purchasePrice != null ? String(l.purchasePrice) : null,
				freeQty: l.freeQty != null ? String(l.freeQty) : null,
				freeUnitId:
					l.freeUnitId != null && String(l.freeUnitId).trim() !== ''
						? Number(l.freeUnitId)
						: null,
				discountAmount:
					l.discountAmount != null ? String(l.discountAmount) : null,
				discountPercent:
					l.discountPercent != null ? String(l.discountPercent) : null,
				taxAmount: l.taxAmount != null ? String(l.taxAmount) : null,
				taxPercent: l.taxPercent != null ? String(l.taxPercent) : null
			}))
		});
		return json(data);
	}
	const data = await createAndPostGoodsReceipt(event, {
		hospitalId,
		poId: String(body.poId ?? ''),
		storeId: Number(body.storeId ?? 0),
		receivedDate: String(body.receivedDate ?? ''),
		invoiceNo,
		invoiceDate,
		invoiceAmount,
		invoicePhotoUrl,
		receivedBy,
		lines: lines.map((l) => ({
			poLineId: Number(l.poLineId ?? 0),
			receivedQty: String(l.receivedQty ?? '0'),
			batchNo: l.batchNo != null ? String(l.batchNo) : null,
			expiryDate: l.expiryDate != null ? String(l.expiryDate) : null,
			purchasePrice:
				l.purchasePrice != null ? String(l.purchasePrice) : null,
			freeQty: l.freeQty != null ? String(l.freeQty) : null,
			freeUnitId:
				l.freeUnitId != null && String(l.freeUnitId).trim() !== ''
					? Number(l.freeUnitId)
					: null,
			discountAmount:
				l.discountAmount != null ? String(l.discountAmount) : null,
			discountPercent:
				l.discountPercent != null ? String(l.discountPercent) : null,
			taxAmount: l.taxAmount != null ? String(l.taxAmount) : null,
			taxPercent: l.taxPercent != null ? String(l.taxPercent) : null
		}))
	});
	return json(data);
};
