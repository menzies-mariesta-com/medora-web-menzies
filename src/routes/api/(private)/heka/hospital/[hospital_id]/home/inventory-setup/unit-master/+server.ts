import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as um from '$lib/server/heka/administration/unit-master.server';
import { StatusEnum } from '$lib/model/enum/db-link';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const sp = event.url.searchParams;
	const mode = sp.get('mode') ?? '';

	if (mode === 'unitTypes') {
		return json(await um.listUnitTypesForUnitMaster());
	}

	const idStr = sp.get('id');
	if (idStr != null && idStr !== '') {
		const id = Number(idStr);
		if (!Number.isFinite(id)) throw error(400, 'Invalid id');
		const row = await um.getUnitByIdForMaster({ id });
		if (!row) throw error(404, 'Not found');
		return json(row);
	}

	const page = Number(sp.get('page') ?? '1');
	const pageSize = Number(sp.get('pageSize') ?? '10');
	const search = sp.get('search') ?? undefined;
	const unitTypeIdRaw = sp.get('unitTypeId');
	const unitTypeId =
		unitTypeIdRaw != null && unitTypeIdRaw !== ''
			? Number(unitTypeIdRaw)
			: undefined;
	const statusIdRaw = sp.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;

	return json(
		await um.getUnitsPaginated({
			page,
			pageSize,
			search:
				search != null && search.trim() !== '' ? search.trim() : undefined,
			unitTypeId: Number.isFinite(unitTypeId as number)
				? unitTypeId
				: undefined,
			statusId: Number.isFinite(statusId as number) ? statusId : undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const name = body.name != null ? String(body.name) : '';
	const unitTypeIdRaw = body.unitTypeId;
	const unitTypeId =
		unitTypeIdRaw != null && unitTypeIdRaw !== ''
			? Number(unitTypeIdRaw)
			: null;
	const statusId =
		body.statusId != null && body.statusId !== ''
			? Number(body.statusId)
			: undefined;
	return json(
		await um.createUnit({
			name,
			unitTypeId: Number.isFinite(unitTypeId as number)
				? (unitTypeId as number)
				: null,
			statusId: Number.isFinite(statusId as number)
				? statusId
				: StatusEnum.ACTIVE
		})
	);
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const id = Number(body.id);
	if (!Number.isFinite(id)) throw error(400, 'id is required');
	const unitTypeIdRaw = body.unitTypeId;
	return json(
		await um.updateUnit({
			id,
			name:
				body.name === undefined ? undefined : String(body.name ?? ''),
			unitTypeId:
				unitTypeIdRaw === undefined
					? undefined
					: unitTypeIdRaw != null && unitTypeIdRaw !== ''
						? Number(unitTypeIdRaw)
						: null,
			statusId:
				body.statusId === undefined
					? undefined
					: body.statusId != null && body.statusId !== ''
						? Number(body.statusId)
						: undefined
		})
	);
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const id = Number(event.url.searchParams.get('id') ?? '0');
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'id is required');
	await um.deleteUnit({ id });
	return json({ ok: true });
}
