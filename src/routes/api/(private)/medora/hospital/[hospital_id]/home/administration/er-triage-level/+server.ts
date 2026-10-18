import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as triage from '$lib/server/medora/er/ed-triage-level.server';
import { StatusEnum } from '$lib/model/enum/db-link';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const idStr = event.url.searchParams.get('id');
	if (idStr) {
		const id = Number(idStr);
		if (!Number.isFinite(id)) throw error(400, 'Invalid id');
		const row = await triage.getEdTriageLevelById({ id, hospitalId });
		if (!row) throw error(404, 'Not found');
		return json(row);
	}

	if (event.url.searchParams.get('active') === '1') {
		return json(await triage.listActiveEdTriageLevels({ hospitalId }));
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const name = event.url.searchParams.get('name') ?? undefined;
	const statusIdRaw = event.url.searchParams.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;

	return json(
		await triage.getEdTriageLevelPaginated({
			hospitalId,
			page,
			pageSize,
			name,
			statusId: Number.isFinite(statusId as number)
				? statusId
				: undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = await event.request.json();
	const name = String(body.name ?? '').trim();
	const level = Number(body.level);
	if (!name) throw error(400, 'Name is required');
	if (!Number.isFinite(level)) throw error(400, 'Level is required');
	return json(
		await triage.createEdTriageLevel({
			hospitalId,
			level,
			name,
			color: body.color ? String(body.color).trim() : 'neutral',
			statusId:
				body.statusId === StatusEnum.INACTIVE
					? StatusEnum.INACTIVE
					: StatusEnum.ACTIVE
		})
	);
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = await event.request.json();
	const id = Number(body.id);
	if (!Number.isFinite(id) || id <= 0)
		throw error(400, 'id is required');
	return json(
		await triage.updateEdTriageLevel({
			id,
			hospitalId,
			level:
				body.level !== undefined ? Number(body.level) : undefined,
			name: body.name != null ? String(body.name).trim() : undefined,
			color:
				body.color !== undefined ? String(body.color).trim() : undefined,
			statusId:
				body.statusId !== undefined ? Number(body.statusId) : undefined
		})
	);
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const id = Number(event.url.searchParams.get('id') ?? '0');
	if (!Number.isFinite(id) || id <= 0)
		throw error(400, 'id is required');
	await triage.deleteEdTriageLevel({ id, hospitalId });
	return json({ ok: true });
}
