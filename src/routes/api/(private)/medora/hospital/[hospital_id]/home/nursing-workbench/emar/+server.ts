import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as emar from '$lib/server/medora/clinical/emar.server';
import { parseUuid } from '$lib/util/id.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? 'schedule.list';
	const from =
		event.url.searchParams.get('from') ??
		new Date(Date.now() - 86400000).toISOString();
	const to =
		event.url.searchParams.get('to') ??
		new Date(Date.now() + 86400000 * 2).toISOString();
	const visitId = parseUuid(event.url.searchParams.get('visitId'));
	switch (mode) {
		case 'schedule.list':
			return json(
				await emar.listEmarSchedules({
					hospitalId,
					visitId: visitId ?? undefined,
					from,
					to
				})
			);
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
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
					nurseStaffId: String(staffId),
					lateReason:
						body.lateReason != null ? String(body.lateReason) : undefined,
					remark: body.remark != null ? String(body.remark) : undefined
				})
			);
		case 'schedule.generate':
			await emar.generateSchedulesForLine({
				hospitalId,
				visitId,
				lineId: Number(body.lineId ?? 0),
				startAt: String(body.startAt ?? new Date().toISOString()),
				durationDays: Number(body.durationDays ?? 1),
				dosesPerDay: Number(body.dosesPerDay ?? 1)
			});
			return json({ ok: true });
		case 'infusion.save':
			await emar.saveInfusionForLine({
				lineId: Number(body.lineId ?? 0),
				infusionType: String(body.infusionType ?? 'continuous'),
				totalVolumeMl:
					body.totalVolumeMl != null ? String(body.totalVolumeMl) : null,
				rateMlHr: body.rateMlHr != null ? String(body.rateMlHr) : null,
				diluentItemMasterId:
					body.diluentItemMasterId != null
						? Number(body.diluentItemMasterId)
						: null,
				concentration:
					body.concentration != null ? String(body.concentration) : null,
				pumpId: body.pumpId != null ? String(body.pumpId) : null
			});
			return json({ ok: true });
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}
