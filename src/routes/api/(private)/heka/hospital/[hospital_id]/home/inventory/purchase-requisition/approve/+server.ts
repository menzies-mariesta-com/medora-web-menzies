import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { approvePurchaseRequisition } from '$lib/server/heka/inventory/pr.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const adjRaw = body.lineAdjustments as
		| { lineId: unknown; quantity: unknown }[]
		| undefined;
	const data = await approvePurchaseRequisition(event, {
		hospitalId,
		prId: String(body.prId ?? ''),
		action: Number(body.action ?? 0),
		remarks: body.remarks != null ? String(body.remarks) : null,
		lineAdjustments: adjRaw?.map((a) => ({
			lineId: Number(a.lineId ?? 0),
			quantity: String(a.quantity ?? '0')
		}))
	});
	return json(data);
};
