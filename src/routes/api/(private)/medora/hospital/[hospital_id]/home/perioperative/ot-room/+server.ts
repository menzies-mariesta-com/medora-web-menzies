import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as otRoom from '$lib/server/medora/perioperative/ot-room.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	return json(
		await otRoom.listOtRooms({
			hospitalId,
			branchId: event.url.searchParams.get('branchId')
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	if (body.action === 'delete') {
		await otRoom.deleteOtRoom({
			hospitalId,
			id: Number(body.id)
		});
		return json({ ok: true });
	}
	const branchId = String(body.branchId ?? '').trim();
	if (!branchId) throw error(400, 'branchId is required');
	return json(
		await otRoom.saveOtRoom({
			id: body.id ? Number(body.id) : undefined,
			hospitalId,
			branchId,
			name: String(body.name ?? ''),
			sequenceNo: body.sequenceNo ? Number(body.sequenceNo) : 0
		})
	);
}
