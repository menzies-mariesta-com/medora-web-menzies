import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as bed from '$lib/server/medora/ipd/bed.server';
import {
	IpdBedStatusEnum,
	StatusEnum
} from '$lib/model/enum/db-link';

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
		return json(await bed.getBedById({ id }));
	}

	if (event.url.searchParams.get('free') === '1') {
		const wardIdRaw = event.url.searchParams.get('wardId');
		const roomIdRaw = event.url.searchParams.get('roomId');
		const wardId =
			wardIdRaw != null && wardIdRaw !== ''
				? Number(wardIdRaw)
				: undefined;
		const roomId =
			roomIdRaw != null && roomIdRaw !== ''
				? Number(roomIdRaw)
				: undefined;
		if (
			!Number.isFinite(wardId as number) &&
			!Number.isFinite(roomId as number)
		) {
			throw error(400, 'wardId or roomId is required');
		}
		return json(
			await bed.listFreeBeds({
				hospitalId,
				wardId: Number.isFinite(wardId as number) ? wardId : undefined,
				roomId: Number.isFinite(roomId as number) ? roomId : undefined
			})
		);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const name = event.url.searchParams.get('name') ?? undefined;
	const code = event.url.searchParams.get('code') ?? undefined;
	const wardIdRaw = event.url.searchParams.get('wardId');
	const wardId =
		wardIdRaw != null && wardIdRaw !== ''
			? Number(wardIdRaw)
			: undefined;
	const roomIdRaw = event.url.searchParams.get('roomId');
	const roomId =
		roomIdRaw != null && roomIdRaw !== ''
			? Number(roomIdRaw)
			: undefined;
	const bedStatusRaw = event.url.searchParams.get('bedStatus');
	const bedStatus =
		bedStatusRaw != null && bedStatusRaw !== ''
			? Number(bedStatusRaw)
			: undefined;
	const statusIdRaw = event.url.searchParams.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;

	return json(
		await bed.getBedPaginated({
			hospitalId,
			page,
			pageSize,
			name,
			code,
			wardId: Number.isFinite(wardId as number) ? wardId : undefined,
			roomId: Number.isFinite(roomId as number) ? roomId : undefined,
			bedStatus: Number.isFinite(bedStatus as number)
				? bedStatus
				: undefined,
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

	if (body.action === 'markAvailable') {
		const id = Number(body.id);
		if (!Number.isFinite(id) || id <= 0)
			throw error(400, 'id is required');
		return json(await bed.markBedAvailable({ id, hospitalId }));
	}

	const roomId = Number(body.roomId);
	if (!Number.isFinite(roomId) || roomId <= 0)
		throw error(400, 'Room is required');
	const name = String(body.name ?? '').trim();
	if (!name) throw error(400, 'Bed name is required');
	return json(
		await bed.createBed({
			hospitalId,
			roomId,
			name,
			code: body.code ? String(body.code).trim() : null,
			basePrice: String(body.basePrice ?? '0'),
			bedStatus:
				typeof body.bedStatus === 'number'
					? body.bedStatus
					: IpdBedStatusEnum.FREE,
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
		await bed.updateBed({
			id,
			hospitalId,
			roomId:
				body.roomId !== undefined ? Number(body.roomId) : undefined,
			name: body.name != null ? String(body.name).trim() : undefined,
			code:
				body.code !== undefined
					? body.code
						? String(body.code).trim()
						: null
					: undefined,
			basePrice:
				body.basePrice !== undefined
					? String(body.basePrice)
					: undefined,
			bedStatus:
				body.bedStatus !== undefined
					? Number(body.bedStatus)
					: undefined,
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
	await bed.deleteBed({ id });
	return json({ ok: true });
}
