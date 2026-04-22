import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { approvePurchaseOrder } from '$lib/server/heka/inventory/po.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const adjRaw = body.lineAdjustments as
		| { lineId: unknown; quantity: unknown; unitPrice?: unknown }[]
		| undefined;
	const data = await approvePurchaseOrder(event, {
		hospitalId,
		poId: String(body.poId ?? ''),
		action: Number(body.action ?? 0),
		remarks: body.remarks != null ? String(body.remarks) : null,
		lineAdjustments: adjRaw?.map((a) => ({
			lineId: Number(a.lineId ?? 0),
			quantity: String(a.quantity ?? '0'),
			unitPrice:
				a.unitPrice !== undefined ? String(a.unitPrice) : undefined
		}))
	});
	return json(data);
};
