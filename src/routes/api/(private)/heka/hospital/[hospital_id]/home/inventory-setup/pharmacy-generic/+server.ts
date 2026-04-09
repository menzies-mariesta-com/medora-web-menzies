import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import * as pg from '$lib/server/heka/administration/pharmacy-generic.server';

function hospitalIdFrom(event: RequestEvent): string {
	const hid = event.params.hospital_id;
	return typeof hid === 'string' && hid ? hid : '';
}

export async function GET(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);

	const sp = event.url.searchParams;
	const mode = sp.get('mode') ?? '';

	if (mode === 'search') {
		const q = sp.get('q') ?? '';
		const limit = Number(sp.get('limit') ?? '50');
		return json(
			await pg.searchPharmacyGenericsForHospital(hospitalId, {
				query: q,
				limit: Number.isFinite(limit) ? limit : 50
			})
		);
	}

	const idStr = sp.get('id');
	if (idStr != null && idStr !== '') {
		const id = Number(idStr);
		if (!Number.isFinite(id)) throw error(400, 'Invalid id');
		return json(await pg.getPharmacyGenericById(hospitalId, { id }));
	}

	const page = Number(sp.get('page') ?? '1');
	const pageSize = Number(sp.get('pageSize') ?? '10');
	const search = sp.get('search') ?? undefined;
	const code = sp.get('code') ?? undefined;
	const statusIdRaw = sp.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;

	return json(
		await pg.getPharmacyGenericPaginated(hospitalId, {
			page,
			pageSize,
			search:
				search != null && search.trim() !== '' ? search.trim() : undefined,
			code: code != null && code.trim() !== '' ? code.trim() : undefined,
			statusId: Number.isFinite(statusId as number)
				? statusId
				: undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const name = body.name != null ? String(body.name) : '';
	const code = body.code != null ? String(body.code) : null;
	const statusId =
		body.statusId != null && body.statusId !== ''
			? Number(body.statusId)
			: undefined;
	return json(
		await pg.createPharmacyGeneric(hospitalId, {
			name,
			code,
			statusId: Number.isFinite(statusId as number)
				? statusId
				: undefined
		})
	);
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const id = Number(body.id);
	if (!Number.isFinite(id)) throw error(400, 'id is required');
	return json(
		await pg.updatePharmacyGeneric(hospitalId, {
			id,
			name:
				body.name === undefined ? undefined : String(body.name ?? ''),
			code:
				body.code === undefined
					? undefined
					: body.code != null
						? String(body.code)
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
	await pg.deletePharmacyGeneric(hospitalId, { id });
	return json({ ok: true });
}
