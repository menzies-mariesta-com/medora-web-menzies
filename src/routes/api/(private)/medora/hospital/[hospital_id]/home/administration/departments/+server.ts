import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import * as dept from '$lib/server/medora/administration/hospital-department.server';

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
		const row = await dept.getHospitalDepartmentById({ hospitalId, id });
		return json(row);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(
		event.url.searchParams.get('pageSize') ?? '10'
	);
	const name = event.url.searchParams.get('name') ?? undefined;
	const code = event.url.searchParams.get('code') ?? undefined;
	const statusIdRaw = event.url.searchParams.get('statusId');
	const statusId =
		statusIdRaw != null && statusIdRaw !== ''
			? Number(statusIdRaw)
			: undefined;

	return json(
		await dept.getHospitalDepartmentPaginated({
			hospitalId,
			page,
			pageSize,
			name,
			code,
			statusId: Number.isFinite(statusId as number)
				? statusId
				: undefined
		})
	);
}

export async function POST(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const payload = (await event.request.json()) as Record<
		string,
		unknown
	>;
	return json(
		await dept.createHospitalDepartment({
			hospitalId,
			name:
				payload.name != null ? String(payload.name) : null,
			code:
				payload.code != null ? String(payload.code) : null,
			statusId: Number(payload.statusId ?? 1)
		})
	);
}

export async function PUT(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const payload = (await event.request.json()) as Record<
		string,
		unknown
	>;
	const id = Number(payload.id);
	if (!Number.isFinite(id)) throw error(400, 'id is required');
	return json(
		await dept.updateHospitalDepartment({
			hospitalId,
			id,
			name:
				payload.name === undefined
					? undefined
					: payload.name != null
						? String(payload.name)
						: null,
			code:
				payload.code === undefined
					? undefined
					: payload.code != null
						? String(payload.code)
						: null,
			statusId:
				payload.statusId === undefined
					? undefined
					: Number(payload.statusId)
		})
	);
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = hospitalIdFrom(event);
	await ensureCanAccessHospital(event, hospitalId);
	const id = Number(event.url.searchParams.get('id') ?? '0');
	if (!Number.isFinite(id) || id <= 0)
		throw error(400, 'id is required');
	await dept.deleteHospitalDepartment({ hospitalId, id });
	return json({ ok: true });
}
