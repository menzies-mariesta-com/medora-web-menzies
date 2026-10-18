import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as registry from '$lib/server/medora/clinical/registry.server';
import { parseUuid } from '$lib/util/id.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? 'definitions';
	switch (mode) {
		case 'definitions':
			return json(await registry.listRegistryDefinitions(hospitalId));
		case 'members': {
			const registryDefinitionId = Number(
				event.url.searchParams.get('registryDefinitionId') ?? 0
			);
			return json(
				await registry.listRegistryMembers({
					registryDefinitionId,
					recallOnly: event.url.searchParams.get('recallOnly') === '1'
				})
			);
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const mode = String(body.mode ?? '');
	switch (mode) {
		case 'seedDefaults':
			await registry.seedDefaultRegistries(hospitalId);
			return json({ ok: true });
		case 'enroll': {
			const patientId = parseUuid(body.patientId);
			if (!patientId) throw error(400, 'patientId is required');
			return json(
				await registry.enrollRegistryMember({
					registryDefinitionId: Number(body.registryDefinitionId ?? 0),
					patientId,
					recallIntervalDays: Number(body.recallIntervalDays ?? 90)
				})
			);
		}
		default:
			throw error(400, `Unknown mode: ${mode}`);
	}
}
