import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	listOtMasters,
	saveOtMaster
} from '$lib/server/medora/operation-theatre/ot-master.server';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	return json(
		await listOtMasters({
			hospitalId,
			branchId: event.url.searchParams.get('branchId') || null,
			includeInactive:
				event.url.searchParams.get('includeInactive') === '1'
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	if (!body) throw error(400, 'Body required');
	const branchId = String(body.branchId ?? '').trim();
	if (!branchId) throw error(400, 'Facility is required');
	return json(
		await saveOtMaster({
			id: body.id ? Number(body.id) : undefined,
			hospitalId,
			branchId,
			name: String(body.name ?? ''),
			sequenceNo: Number(body.sequenceNo ?? 0),
			freezeMinutes: Number(body.freezeMinutes ?? 0),
			otAdvanceMandatory: Boolean(body.otAdvanceMandatory),
			active: body.active !== false
		})
	);
}
