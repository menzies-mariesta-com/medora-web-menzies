import { json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { listBedsForAdtStatus } from '$lib/server/medora/adt/bed-status.server';
import { parseCareSetting } from '$lib/model/enum/care-setting.enum';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const numberParam = (key: string) => {
		const raw = event.url.searchParams.get(key);
		if (raw == null || raw === '') return undefined;
		const value = Number(raw);
		return Number.isFinite(value) ? value : undefined;
	};
	const clip = (key: string) => {
		const value = event.url.searchParams.get(key)?.trim() ?? '';
		return value ? value.slice(0, 80) : undefined;
	};
	return json(
		await listBedsForAdtStatus({
			hospitalId,
			careSetting:
				parseCareSetting(event.url.searchParams.get('careSetting')) ??
				undefined,
			wardId: numberParam('wardId'),
			bedStatus: numberParam('bedStatus'),
			patientName: clip('patientName'),
			visitName: clip('visitName'),
			bedName: clip('bedName'),
			roomName: clip('roomName')
		})
	);
}
