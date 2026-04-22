import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postStockIssue } from '$lib/server/heka/inventory/issue.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const lines = (body.lines as Record<string, unknown>[]) ?? [];
	const id = await postStockIssue(event, {
		hospitalId,
		storeId: Number(body.storeId ?? 0),
		issuedTo: body.issuedTo != null ? String(body.issuedTo) : null,
		reason: body.reason != null ? String(body.reason) : null,
		lines: lines.map((l) => ({
			itemId: Number(l.itemId ?? 0),
			qty: String(l.qty ?? '0'),
			unitId: Number(l.unitId ?? 0),
			batchId:
				l.batchId != null && l.batchId !== ''
					? Number(l.batchId)
					: undefined
		}))
	});
	return json({ id });
};
