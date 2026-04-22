import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postStoreTransfer } from '$lib/server/heka/inventory/transfer.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const lines = (body.lines as Record<string, unknown>[]) ?? [];
	const id = await postStoreTransfer(event, {
		hospitalId,
		fromStoreId: Number(body.fromStoreId ?? 0),
		toStoreId: Number(body.toStoreId ?? 0),
		remark: body.remark != null ? String(body.remark) : null,
		lines: lines.map((l) => ({
			itemId: Number(l.itemId ?? 0),
			batchId: Number(l.batchId ?? 0),
			quantity: String(l.quantity ?? '0'),
			unitId: Number(l.unitId ?? 0)
		}))
	});
	return json({ id });
};
