import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { getDocumentPrintBootstrap } from '$lib/server/heka/document-master/document-print.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? 'bootstrap';
	if (mode !== 'bootstrap') throw error(400, `Unknown mode: ${mode}`);

	const code = event.url.searchParams.get('code') ?? '';
	return json(await getDocumentPrintBootstrap(event, hospitalId, code));
}
