import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as ld from '$lib/server/medora/obstetrics/ld-workbench.server';

function parseUuid(value: unknown, name: string): string {
	const s = String(value ?? '').trim();
	if (!s) throw error(400, `${name} is required`);
	return s;
}

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	return json(await ld.listLdBoard({ hospitalId }));
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id ?? null;
	const body = (await event.request.json()) as Record<string, unknown>;
	const action = String(body.action ?? '');

	if (action === 'ensure') {
		return json(
			await ld.ensureLdEncounter({
				hospitalId,
				visitId: parseUuid(body.visitId, 'visitId')
			})
		);
	}
	if (action === 'partogram') {
		return json(
			await ld.savePartogramEntry({
				hospitalId,
				visitId: parseUuid(body.visitId, 'visitId'),
				valuesJson:
					(body.valuesJson as Record<string, unknown>) ?? {},
				sign: Boolean(body.sign),
				staffId
			})
		);
	}
	if (action === 'delivery') {
		return json(
			await ld.saveDeliveryRecord({
				hospitalId,
				visitId: parseUuid(body.visitId, 'visitId'),
				valuesJson:
					(body.valuesJson as Record<string, unknown>) ?? {},
				linkCSectionCase: Boolean(body.linkCSectionCase),
				staffId
			})
		);
	}
	throw error(400, 'Unknown action');
}
