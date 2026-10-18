import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	getResultEntryForAccession,
	saveObservations,
	verifyReport,
	releaseReport,
	listReleasedResultsForVisit
} from '$lib/server/medora/diagnostics/lab-result.server';
import { parseUuid } from '$lib/util/id.util';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const visitId = parseUuid(event.url.searchParams.get('visitId'));
	const accessionId = event.url.searchParams.get('accessionId');
	if (visitId) {
		return json(
			await listReleasedResultsForVisit({ hospitalId, visitId })
		);
	}
	if (accessionId) {
		return json(
			await getResultEntryForAccession({
				hospitalId,
				accessionId: Number(accessionId)
			})
		);
	}
	throw error(400, 'visitId or accessionId required');
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id;
	if (!staffId) throw error(401, 'Staff required');
	const body = (await event.request.json()) as Record<string, unknown>;
	const action = String(body.action ?? '');
	const accessionId = Number(body.accessionId);

	switch (action) {
		case 'save':
			await saveObservations({
				hospitalId,
				accessionId,
				staffId: String(staffId),
				lines: Array.isArray(body.lines) ? (body.lines as never) : []
			});
			return json({ ok: true });
		case 'verify':
			await verifyReport({
				hospitalId,
				accessionId,
				staffId: String(staffId)
			});
			return json({ ok: true });
		case 'release':
			await releaseReport({
				hospitalId,
				accessionId,
				staffId: String(staffId)
			});
			return json({ ok: true });
		default:
			throw error(400, `Unknown action: ${action}`);
	}
}
