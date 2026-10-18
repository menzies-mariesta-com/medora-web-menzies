import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as alerts from '$lib/server/medora/clinical/clinical-alert.server';
import * as cosign from '$lib/server/medora/clinical/cosign-queue.server';
import { listOpenCriticalCallbacks } from '$lib/server/medora/diagnostics/lab-critical-callback.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? '';
	const staffId = event.locals.staff?.id ?? undefined;
	switch (mode) {
		case 'alerts.open':
			return json(
				await alerts.listOpenClinicalAlerts({
					hospitalId,
					staffId: event.url.searchParams.get('mine') === '1' ? staffId : undefined
				})
			);
		case 'cosign.pending':
			return json(await cosign.listPendingCosignWork({ hospitalId }));
		case 'criticalCallbacks.open': {
			const rows = await listOpenCriticalCallbacks(hospitalId);
			return json(
				rows.map((r) => ({
					id: r.callback.id,
					patientName: r.patientName,
					testName: r.testName,
					resultValue:
						r.valueText ??
						(r.valueNumeric != null ? String(r.valueNumeric) : ''),
					callbackStatus: r.callback.callbackStatus
				}))
			);
		}
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
	switch (mode) {
		case 'alerts.acknowledge':
			await alerts.acknowledgeClinicalAlert({
				hospitalId,
				alertId: Number(body.alertId ?? 0),
				staffId: String(staffId)
			});
			return json({ ok: true });
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}
