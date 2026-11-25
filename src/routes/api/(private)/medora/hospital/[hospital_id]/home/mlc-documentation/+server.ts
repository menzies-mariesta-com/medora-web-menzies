import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	createMlcAddendum,
	getMlcBootstrap,
	saveMlcDraft,
	signMlc
} from '$lib/server/medora/mlc-documentation/mlc-documentation.server';
import { parseUuid } from '$lib/util/id.util';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

function visitIdFrom(
	event: RequestEvent,
	raw: string | null | undefined
) {
	const visitId = parseUuid(raw ?? null);
	if (!visitId) throw error(400, 'visitId is required');
	return visitId;
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const mode = event.url.searchParams.get('mode') ?? 'bootstrap';
	if (mode !== 'bootstrap') throw error(400, `Unknown mode: ${mode}`);

	const visitId = visitIdFrom(
		event,
		event.url.searchParams.get('visitId')
	);

	return json(
		await getMlcBootstrap({
			hospitalId,
			visitId,
			staffId: event.locals.staff?.id ?? null
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const body = (await event.request
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	const action = String(body?.action ?? '');
	const visitId = visitIdFrom(event, String(body?.visitId ?? ''));
	const valuesJson =
		(body?.valuesJson as Record<string, unknown> | undefined) ?? {};
	const staffId = event.locals.staff?.id ?? null;
	const rawId = body?.id != null ? Number(body.id) : undefined;
	const id =
		Number.isFinite(rawId) && (rawId ?? 0) > 0 ? rawId : undefined;

	switch (action) {
		case 'draft':
			return json(
				await saveMlcDraft({
					hospitalId,
					visitId,
					valuesJson,
					staffId,
					id
				})
			);
		case 'sign': {
			if (!staffId)
				throw error(403, 'Only staff can sign an MLC record');
			return json(
				await signMlc({
					hospitalId,
					visitId,
					valuesJson,
					staffId,
					id
				})
			);
		}
		case 'addendum': {
			if (!staffId)
				throw error(403, 'Only staff can amend an MLC record');
			const parentInstanceId = Number(body?.parentInstanceId ?? 0);
			if (
				!Number.isFinite(parentInstanceId) ||
				parentInstanceId <= 0
			) {
				throw error(400, 'parentInstanceId is required');
			}
			return json(
				await createMlcAddendum({
					hospitalId,
					visitId,
					parentInstanceId,
					valuesJson,
					staffId
				})
			);
		}
		default:
			throw error(400, `Unknown action: ${action}`);
	}
}
