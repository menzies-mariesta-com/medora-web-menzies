import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { getDocumentsWithRelations } from '$lib/server/heka/document-master/document.server';
import { getDocumentSettingsForPrint } from '$lib/server/heka/document-master/document-print.server';
import * as obs from '$lib/server/heka/observation/observation-emr.server';

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
	const mode = event.url.searchParams.get('mode') ?? 'bootstrap';

	if (mode !== 'bootstrap') throw error(400, `Unknown mode: ${mode}`);

	const [visit, documents, documentSettings] = await Promise.all([
		visitId && Number.isFinite(visitId)
			? obs.getPatientVisitById({ id: visitId, hospitalId })
			: Promise.resolve(null),
		getDocumentsWithRelations(event),
		getDocumentSettingsForPrint(event, hospitalId)
	]);

	return json({ visit, documents, documentSettings });
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
