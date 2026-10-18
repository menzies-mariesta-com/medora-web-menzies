import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { listSectionWorklist } from '$lib/server/medora/diagnostics/lab-worklist.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const section = event.url.searchParams.get('section');
	if (!section) throw error(400, 'section is required');
	return json(await listSectionWorklist({ hospitalId, section }));
}
