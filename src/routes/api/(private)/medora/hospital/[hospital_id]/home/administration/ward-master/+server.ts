import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as ward from '$lib/server/medora/ipd/ward.server';
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
		return json(await ward.getWardById({ id }));
	}

	if (event.url.searchParams.get('active') === '1') {
		const branchId =
			event.url.searchParams.get('branchId') || undefined;
		return json(
			await ward.listActiveWards({ hospitalId, branchId })
		);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const name = event.url.searchParams.get('name') ?? undefined;
	const code = event.url.searchParams.get('code') ?? undefined;
	const branchId =
		event.url.searchParams.get('branchId') ?? undefined;
	const statusIdRaw = event.url.searchParams.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;

	return json(
		await ward.getWardPaginated({
			hospitalId,
			page,
			pageSize,
			name,
			code,
			branchId,
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
	const branchId = String(body.branchId ?? '').trim();
	if (!branchId) throw error(400, 'Branch is required');
	const name = String(body.name ?? '').trim();
	if (!name) throw error(400, 'Ward name is required');
	return json(
		await ward.createWard({
			hospitalId,
			branchId,
			name,
			code: body.code ? String(body.code).trim() : null,
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
	const branchId =
		body.branchId !== undefined
			? String(body.branchId ?? '').trim()
			: undefined;
	if (branchId !== undefined && !branchId) {
		throw error(400, 'Branch is required');
	}
	return json(
		await ward.updateWard({
			id,
			hospitalId,
			name: body.name != null ? String(body.name).trim() : undefined,
			code:
				body.code !== undefined
					? body.code
						? String(body.code).trim()
						: null
					: undefined,
			branchId,
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
	await ward.deleteWard({ id, hospitalId });
	return json({ ok: true });
}
