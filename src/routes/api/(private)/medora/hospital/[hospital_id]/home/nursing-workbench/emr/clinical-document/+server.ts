import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { getClinicalFormDocuments } from '$lib/server/medora/document-master/document.server';
import { listTextPlaceholdersAsMap } from '$lib/server/medora/document-master/text-placeholder.server';
import * as obs from '$lib/server/medora/observation/observation-emr.server';
import { parseUuid } from '$lib/util/id.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const visitId = parseUuid(event.url.searchParams.get('visitId'));
	const mode = event.url.searchParams.get('mode') ?? 'bootstrap';

	if (!visitId) throw error(400, 'visitId is required');
	if (mode !== 'bootstrap') throw error(400, `Unknown mode: ${mode}`);

	const [visit, documents, textPlaceholders] = await Promise.all([
		Boolean(visitId)
			? obs.getPatientVisitById({ id: visitId, hospitalId })
			: Promise.resolve(null),
		getClinicalFormDocuments(event, { hospitalId }),
		listTextPlaceholdersAsMap(hospitalId)
	]);

	return json({ visit, documents, textPlaceholders });
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const body = (await event.request.json().catch(() => null)) as any;
	const mode = String(body?.mode ?? '');
	if (!mode) throw error(400, 'mode is required');

	switch (mode) {
		case 'patientDocument.create': {
			return json(await obs.createPatientDocument(body?.payload));
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}
