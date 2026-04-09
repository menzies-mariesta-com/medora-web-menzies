import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	deleteStaff,
	getStaffByIdWithRelations,
	getStaffListPaginated
} from '$lib/server/heka/administration/staff.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;

	const id = event.url.searchParams.get('id');
	if (id) {
		const data = await getStaffByIdWithRelations(event, {
			hospitalId,
			id
		});
		return json(data);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const search = event.url.searchParams.get('search') ?? undefined;
	const staffCode = event.url.searchParams.get('staffCode') ?? undefined;
	const staffName = event.url.searchParams.get('staffName') ?? undefined;
	const staffPhonePrimary =
		event.url.searchParams.get('staffPhonePrimary') ?? undefined;

	const data = await getStaffListPaginated(event, {
		hospitalId,
		page,
		pageSize,
		search,
		staffCode,
		staffName,
		staffPhonePrimary
	});
	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	await deleteStaff(event, { hospitalId, id: String(body.id ?? '') });
	return json({ ok: true });
};

