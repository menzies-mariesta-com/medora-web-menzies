import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cancelPurchaseRequisition } from '$lib/server/heka/inventory/pr.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const prId = String(body.prId ?? '');
	const reason = String(body.reason ?? '');
	const data = await cancelPurchaseRequisition(event, {
		hospitalId,
		prId,
		reason
	});
	return json(data);
};
