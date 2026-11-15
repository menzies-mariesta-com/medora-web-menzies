import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as traumaLog from '$lib/server/medora/ed/trauma-log.server';
import { listActiveTraumaLevels } from '$lib/server/medora/ed/trauma-activation-setup.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

function parseUuid(value: unknown, name: string): string {
	const s = String(value ?? '').trim();
	if (!s) throw error(400, `${name} is required`);
	return s;
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const mode = event.url.searchParams.get('mode') ?? 'active';

	if (mode === 'levels') {
		return json(await listActiveTraumaLevels({ hospitalId }));
	}
	if (mode === 'active') {
		return json(await traumaLog.listActiveTraumaRich({ hospitalId }));
	}
	if (mode === 'history') {
		return json(
			await traumaLog.listTraumaHistory({
				hospitalId,
				dateFrom: event.url.searchParams.get('dateFrom') ?? undefined,
				dateTo: event.url.searchParams.get('dateTo') ?? undefined,
				levelCode: event.url.searchParams.get('levelCode') ?? undefined,
				page: Number(event.url.searchParams.get('page') ?? '1'),
				pageSize: Number(event.url.searchParams.get('pageSize') ?? '20')
			})
		);
	}
	if (mode === 'detail') {
		const id = Number(event.url.searchParams.get('id') ?? '0');
		if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
		return json(await traumaLog.getTraumaActivationDetail({ hospitalId, id }));
	}
	if (mode === 'visit_context') {
		const visitId = parseUuid(
			event.url.searchParams.get('visitId'),
			'visitId'
		);
		return json(await traumaLog.getTraumaVisitContext({ hospitalId, visitId }));
	}
	if (mode === 'visit_search') {
		const q = event.url.searchParams.get('q') ?? '';
		return json(await traumaLog.searchTraumaVisits({ hospitalId, q }));
	}

	throw error(400, 'Unknown mode');
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const staffId = event.locals.staff?.id ?? null;
	if (!staffId) throw error(401, 'Unauthorized');

	const body = (await event.request.json()) as Record<string, unknown>;
	const action = String(body.action ?? '');

	if (action === 'activate') {
		return json(
			await traumaLog.activateTraumaForVisit({
				hospitalId,
				visitId: parseUuid(body.visitId, 'visitId'),
				levelCode: String(body.levelCode ?? ''),
				staffId,
				valuesJson: (body.valuesJson as Record<string, unknown>) ?? {},
				erBedId:
					body.erBedId != null && body.erBedId !== ''
						? Number(body.erBedId)
						: undefined
			})
		);
	}
	if (action === 'deactivate') {
		const id = Number(body.id);
		if (!Number.isFinite(id)) throw error(400, 'id is required');
		await traumaLog.deactivateTraumaWithReason({
			hospitalId,
			id,
			reason: String(body.reason ?? '')
		});
		return json({ ok: true });
	}
	if (action === 'milestone_complete') {
		await traumaLog.completeTraumaMilestone({
			hospitalId,
			activationId: Number(body.activationId),
			templateId: Number(body.templateId),
			staffId
		});
		return json({ ok: true });
	}
	if (action === 'team_ack') {
		await traumaLog.ackTraumaTeamRole({
			hospitalId,
			activationId: Number(body.activationId),
			roleId: Number(body.roleId),
			staffId,
			notified: Boolean(body.notified)
		});
		return json({ ok: true });
	}

	throw error(400, 'Unknown action');
}