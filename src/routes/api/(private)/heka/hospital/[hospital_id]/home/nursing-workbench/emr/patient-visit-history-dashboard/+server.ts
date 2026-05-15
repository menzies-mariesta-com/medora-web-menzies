import { error, json, type RequestEvent } from '@sveltejs/kit';
import { getVisitDashboardPayload } from '$lib/server/heka/visit/visit-history-dashboard.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	const visitId = Number(
		event.url.searchParams.get('visitId') ?? '0'
	);
	if (!Number.isFinite(visitId) || visitId <= 0) {
		throw error(400, 'visitId is required');
	}
	const data = await getVisitDashboardPayload(event, {
		hospitalId,
		visitId
	});
	return json(data);
}
