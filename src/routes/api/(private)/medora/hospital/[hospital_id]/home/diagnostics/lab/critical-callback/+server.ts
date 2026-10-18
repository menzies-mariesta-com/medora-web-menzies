import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	listOpenCriticalCallbacks,
	completeCriticalCallback
} from '$lib/server/medora/diagnostics/lab-critical-callback.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const rows = await listOpenCriticalCallbacks(hospitalId);
	return json(
		rows.map((r) => ({
			id: r.callback.id,
			observationId: r.callback.observationId,
			visitId: r.callback.visitId,
			patientId: r.callback.patientId,
			patientName: r.patientName,
			testName: r.testName,
			resultValue:
				r.valueText ??
				(r.valueNumeric != null ? String(r.valueNumeric) : ''),
			callbackStatus: r.callback.callbackStatus,
			calledParty: r.callback.calledParty,
			readBackText: r.callback.readBackText,
			calledAt: r.callback.calledAt,
			createdAt: r.callback.createdAt
		}))
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id;
	if (!staffId) throw error(401, 'Staff required');
	const body = (await event.request.json()) as Record<string, unknown>;
	if (String(body.action) !== 'complete') {
		throw error(400, 'Unknown action');
	}
	return json(
		await completeCriticalCallback({
			hospitalId,
			callbackId: Number(body.callbackId),
			staffId: String(staffId),
			calledParty: String(body.calledParty ?? ''),
			readBackText: String(body.readBackText ?? '')
		})
	);
}
