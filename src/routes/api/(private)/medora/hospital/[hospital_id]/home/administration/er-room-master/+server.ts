import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as erRoom from '$lib/server/medora/er/er-room.server';
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
		return json(await erRoom.getErRoomById({ id }));
	}

	if (event.url.searchParams.get('active') === '1') {
		const wardIdRaw = event.url.searchParams.get('wardId');
		const wardId =
			wardIdRaw != null && wardIdRaw !== ''
				? Number(wardIdRaw)
				: undefined;
		return json(
			await erRoom.listActiveErRooms({
				hospitalId,
				erWardId: Number.isFinite(wardId as number) ? wardId : undefined
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
	const erRoomCategoryIdRaw =
		event.url.searchParams.get('erRoomCategoryId');
	const erRoomCategoryId =
		erRoomCategoryIdRaw != null && erRoomCategoryIdRaw !== ''
			? Number(erRoomCategoryIdRaw)
			: undefined;
	const statusIdRaw = event.url.searchParams.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;

	return json(
		await erRoom.getErRoomPaginated({
			hospitalId,
			page,
			pageSize,
			name,
			code,
			erWardId: Number.isFinite(wardId as number) ? wardId : undefined,
			erRoomCategoryId: Number.isFinite(erRoomCategoryId as number)
				? erRoomCategoryId
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
	const wardId = Number(body.wardId);
	if (!Number.isFinite(wardId) || wardId <= 0)
		throw error(400, 'Ward is required');
	const erRoomCategoryId = Number(body.erRoomCategoryId);
	if (!Number.isFinite(erRoomCategoryId) || erRoomCategoryId <= 0) {
		throw error(400, 'Room category is required');
	}
	const name = String(body.name ?? '').trim();
	if (!name) throw error(400, 'Room name is required');
	return json(
		await erRoom.createErRoom({
			hospitalId,
			erWardId: wardId,
			erRoomCategoryId,
			name,
			code: body.code ? String(body.code).trim() : null,
			amenities: body.amenities
				? String(body.amenities).trim()
				: null,
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
	const erRoomCategoryId =
		body.erRoomCategoryId !== undefined
			? Number(body.erRoomCategoryId)
			: undefined;
	if (
		erRoomCategoryId !== undefined &&
		(!Number.isFinite(erRoomCategoryId) || erRoomCategoryId <= 0)
	) {
		throw error(400, 'Room category is required');
	}
	return json(
		await erRoom.updateErRoom({
			id,
			hospitalId,
			erWardId:
				body.wardId !== undefined ? Number(body.wardId) : undefined,
			erRoomCategoryId,
			name: body.name != null ? String(body.name).trim() : undefined,
			code:
				body.code !== undefined
					? body.code
						? String(body.code).trim()
						: null
					: undefined,
			amenities:
				body.amenities !== undefined
					? body.amenities
						? String(body.amenities).trim()
						: null
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
	await erRoom.deleteErRoom({ id, hospitalId });
	return json({ ok: true });
}
