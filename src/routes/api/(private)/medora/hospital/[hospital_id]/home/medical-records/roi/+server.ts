import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as roi from '$lib/server/medora/clinical/roi.server';
import { parseUuid } from '$lib/util/id.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	return json(await roi.listRoiRequests(hospitalId));
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id ?? null;
	const body = (await event.request.json()) as Record<string, unknown>;
	const mode = String(body.mode ?? 'create');
	switch (mode) {
		case 'create': {
			const patientId = parseUuid(body.patientId);
			if (!patientId) throw error(400, 'patientId is required');
			return json(
				await roi.createRoiRequest({
					hospitalId,
					patientId,
					requesterName: String(body.requesterName ?? ''),
					requesterContact:
						body.requesterContact != null
							? String(body.requesterContact)
							: null,
					scopeDescription: String(body.scopeDescription ?? ''),
					dueDate: body.dueDate != null ? String(body.dueDate) : null,
					assignedStaffId:
						body.assignedStaffId != null
							? String(body.assignedStaffId)
							: null,
					staffId
				})
			);
		}
		case 'updateStatus':
			await roi.updateRoiStatus({
				hospitalId,
				id: Number(body.id ?? 0),
				requestStatus: String(body.requestStatus ?? ''),
				remark: body.remark != null ? String(body.remark) : undefined,
				staffId
			});
			return json({ ok: true });
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}
