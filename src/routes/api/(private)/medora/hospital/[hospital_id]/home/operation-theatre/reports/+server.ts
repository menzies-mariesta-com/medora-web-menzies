import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { listOtReport } from '$lib/server/medora/operation-theatre/ot-report.server';
import { getOtCaseSheet } from '$lib/server/medora/operation-theatre/ot-billing.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const q = event.url.searchParams;
	const visitId = (q.get('visitId') ?? '').trim();
	if (visitId) {
		return json({
			caseSheet: await getOtCaseSheet({ hospitalId, visitId })
		});
	}
	if (q.get('mode') === 'casesheet') {
		throw error(400, 'Select an encounter to load the OT case sheet.');
	}
	const today = new Date().toISOString().slice(0, 10);
	return json({
		rows: await listOtReport({
			hospitalId,
			branchId: q.get('branchId') || null,
			fromDate: q.get('fromDate') || today,
			toDate: q.get('toDate') || today,
			statusTaggingId: q.get('statusTaggingId')
				? Number(q.get('statusTaggingId'))
				: null
		})
	});
}
