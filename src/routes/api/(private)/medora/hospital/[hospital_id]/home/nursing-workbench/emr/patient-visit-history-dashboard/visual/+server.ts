import { error, json, type RequestEvent } from '@sveltejs/kit';
import { getVisitVisualPayload } from '$lib/server/medora/visit/visit-visual-dashboard.server';
import { parseUuid } from '$lib/util/id.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

/** Clamp untrusted paging input to the range the server module accepts. */
function clampInt(raw: string | null, fallback: number, max: number): number {
	const n = Number(raw ?? fallback);
	return Number.isFinite(n) && n >= 1
		? Math.min(Math.trunc(n), max)
		: fallback;
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	const visitId = parseUuid(event.url.searchParams.get('visitId'));
	if (!visitId) {
		throw error(400, 'visitId is required');
	}

	const data = await getVisitVisualPayload(event, {
		hospitalId,
		visitId,
		page: clampInt(event.url.searchParams.get('page'), 1, 1000),
		pageSize: clampInt(event.url.searchParams.get('pageSize'), 10, 100)
	});
	return json(data);
}
