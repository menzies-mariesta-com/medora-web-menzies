import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as emar from '$lib/server/medora/clinical/emar.server';
import { parseUuid } from '$lib/util/id.util';

const MS_PER_HOUR = 3_600_000;
/** Default chart window: the shift being worked, 12h either side of now. */
const DEFAULT_WINDOW_HOURS = 12;

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

/** A window must be bounded: an unbounded one would materialise years of doses. */
function resolveWindow(event: RequestEvent): { from: string; to: string } {
	const now = Date.now();
	const from =
		event.url.searchParams.get('from') ??
		new Date(now - DEFAULT_WINDOW_HOURS * MS_PER_HOUR).toISOString();
	const to =
		event.url.searchParams.get('to') ??
		new Date(now + DEFAULT_WINDOW_HOURS * MS_PER_HOUR).toISOString();
	const fromMs = Date.parse(from);
	const toMs = Date.parse(to);
	if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs < fromMs) {
		throw error(400, 'Invalid chart window');
	}
	if (toMs - fromMs > 7 * 24 * MS_PER_HOUR) {
		throw error(400, 'Chart window cannot exceed 7 days');
	}
	return { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() };
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? 'mar';
	if (mode !== 'mar') throw error(400, `Unknown mode: ${mode}`);

	const visitId = parseUuid(event.url.searchParams.get('visitId'));
	if (!visitId) throw error(400, 'visitId is required');
	const { from, to } = resolveWindow(event);

	await emar.ensureSchedulesForVisit({ hospitalId, visitId, from, to });
	return json(await emar.getEmarMar({ hospitalId, visitId, from, to }));
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id;
	if (!staffId) throw error(401, 'Staff required');

	const body = (await event.request.json()) as Record<string, unknown>;
	const mode = String(body.mode ?? '');
	const visitId = parseUuid(body.visitId);
	if (!visitId) throw error(400, 'visitId is required');

	switch (mode) {
		case 'administration.record':
			return json(
				await emar.recordAdministration({
					hospitalId,
					visitId,
					scheduleId:
						body.scheduleId != null ? Number(body.scheduleId) : null,
					lineId: Number(body.lineId ?? 0),
					status: String(body.status ?? 'given'),
					scannedPatientToken: String(body.scannedPatientToken ?? ''),
					scannedProductBarcode: String(body.scannedProductBarcode ?? ''),
					scannedNurseCode: String(body.scannedNurseCode ?? ''),
					// Never from the request body: the charted nurse is the signed-in one.
					nurseStaffId: staffId,
					lateReason:
						body.lateReason != null ? String(body.lateReason) : undefined,
					remark: body.remark != null ? String(body.remark) : undefined
				})
			);
		case 'infusion.event': {
			const kind = String(body.kind ?? '');
			if (kind !== 'start' && kind !== 'stop') {
				throw error(400, 'kind must be start or stop');
			}
			return json(
				await emar.recordInfusionEvent({
					hospitalId,
					visitId,
					lineId: Number(body.lineId ?? 0),
					kind,
					nurseStaffId: staffId,
					remark: body.remark != null ? String(body.remark) : undefined
				})
			);
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}
