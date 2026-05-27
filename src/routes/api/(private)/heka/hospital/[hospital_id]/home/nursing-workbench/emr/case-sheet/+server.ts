import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { getNursingCaseSheetPayload } from '$lib/server/heka/emr/nursing-case-sheet.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const visitId = Number(
		event.url.searchParams.get('visitId') ?? '0'
	);
	if (!Number.isFinite(visitId) || visitId <= 0)
		throw error(400, 'visitId is required');

	const data = await getNursingCaseSheetPayload(event, {
		hospitalId,
		visitId
	});
	return json(data);
}
