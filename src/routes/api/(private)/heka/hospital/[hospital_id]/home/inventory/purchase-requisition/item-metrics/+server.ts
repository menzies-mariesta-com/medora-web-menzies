import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPurchaseRequisitionLineMetrics } from '$lib/server/heka/inventory/pr.server';

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	const fromStoreId = Number(body.fromStoreId ?? 0);
	const prIdRaw = body.prId;
	const prId =
		prIdRaw != null && prIdRaw !== ''
			? String(prIdRaw)
			: undefined;
	const linesRaw =
		(body.lines as { itemId?: unknown; unitId?: unknown }[]) ?? [];
	const lines = linesRaw
		.map((l) => ({
			itemId: Number(l.itemId ?? 0),
			unitId: Number(l.unitId ?? 0)
		}))
		.filter((l) => l.itemId > 0 && l.unitId > 0);
	const data = await getPurchaseRequisitionLineMetrics(event, {
		hospitalId,
		fromStoreId,
		prId: prId ?? null,
		lines
	});
	return json(data);
};
