import { json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { listErBedsForStatus } from '$lib/server/medora/ed/er-bed-status.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const wardIdRaw = event.url.searchParams.get('wardId');
	const bedStatusRaw = event.url.searchParams.get('bedStatus');
	const erWardId =
		wardIdRaw != null && wardIdRaw !== '' ? Number(wardIdRaw) : undefined;
	const bedStatus =
		bedStatusRaw != null && bedStatusRaw !== ''
			? Number(bedStatusRaw)
			: undefined;
	return json(
		await listErBedsForStatus({
			hospitalId,
			erWardId: Number.isFinite(erWardId as number)
				? erWardId
				: undefined,
			bedStatus: Number.isFinite(bedStatus as number)
				? bedStatus
				: undefined
		})
	);
}
