import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resubmitPurchaseOrder } from '$lib/server/heka/inventory/po.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await resubmitPurchaseOrder(event, {
		hospitalId,
		poId: String(body.poId ?? '')
	});
	return json(data);
};
