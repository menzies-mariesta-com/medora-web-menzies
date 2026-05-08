import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { transferGrnToRequestingStore } from '$lib/server/heka/inventory/grn.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const grnId = String(body.grnId ?? '');
	if (!grnId) {
		return json({ error: 'grnId required' }, { status: 400 });
	}
	const data = await transferGrnToRequestingStore(event, { hospitalId, grnId });
	return json(data);
};
