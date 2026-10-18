import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	listReceiveWorklist,
	markReceived,
	rejectSpecimen,
	getAccessionByBarcode,
	startProcessing
} from '$lib/server/medora/diagnostics/lab-accession.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const barcode = event.url.searchParams.get('barcode');
	if (barcode) {
		return json(await getAccessionByBarcode({ hospitalId, barcode }));
	}
	return json(await listReceiveWorklist(hospitalId));
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id;
	if (!staffId) throw error(401, 'Staff required');
	const body = (await event.request.json()) as Record<string, unknown>;
	const action = String(body.action ?? '');
	switch (action) {
		case 'receive':
			await markReceived({
				hospitalId,
				accessionId: Number(body.accessionId),
				staffId: String(staffId)
			});
			return json({ ok: true });
		case 'reject':
			await rejectSpecimen({
				hospitalId,
				accessionId: Number(body.accessionId),
				staffId: String(staffId),
				rejectReason: String(body.rejectReason ?? 'other'),
				rejectNote: body.rejectNote ? String(body.rejectNote) : null
			});
			return json({ ok: true });
		case 'startProcessing':
			await startProcessing({
				hospitalId,
				accessionId: Number(body.accessionId),
				staffId: String(staffId)
			});
			return json({ ok: true });
		default:
			throw error(400, `Unknown action: ${action}`);
	}
}
