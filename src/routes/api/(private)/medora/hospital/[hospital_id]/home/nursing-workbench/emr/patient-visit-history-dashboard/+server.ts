import { error, json, type RequestEvent } from '@sveltejs/kit';
import { getVisitDashboardPayload } from '$lib/server/medora/visit/visit-history-dashboard.server';
import { parseUuid } from '$lib/util/id.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	const visitId = parseUuid(event.url.searchParams.get('visitId'));
	if (!visitId) {
		throw error(400, 'visitId is required');
	}
	const data = await getVisitDashboardPayload(event, {
		hospitalId,
		visitId
	});
	return json(data);
}
