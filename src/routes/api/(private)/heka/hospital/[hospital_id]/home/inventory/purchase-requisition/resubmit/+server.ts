import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resubmitPurchaseRequisition } from '$lib/server/heka/inventory/pr.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await resubmitPurchaseRequisition(event, {
		hospitalId,
		prId: String(body.prId ?? '')
	});
	return json(data);
};
