import { json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { listBedsForAdtStatus } from '$lib/server/medora/adt/bed-status.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const wardIdRaw = event.url.searchParams.get('wardId');
	const bedStatusRaw = event.url.searchParams.get('bedStatus');
	const wardId =
		wardIdRaw != null && wardIdRaw !== '' ? Number(wardIdRaw) : undefined;
	const bedStatus =
		bedStatusRaw != null && bedStatusRaw !== ''
			? Number(bedStatusRaw)
			: undefined;
	const clip = (key: string) => {
		const value = event.url.searchParams.get(key)?.trim() ?? '';
		return value ? value.slice(0, 80) : undefined;
	};
	return json(
		await listBedsForAdtStatus({
			hospitalId,
			wardId: Number.isFinite(wardId as number) ? wardId : undefined,
			bedStatus: Number.isFinite(bedStatus as number)
				? bedStatus
				: undefined,
			patientName: clip('patientName'),
			visitName: clip('visitName'),
			bedName: clip('bedName'),
			roomName: clip('roomName')
		})
	);
}
