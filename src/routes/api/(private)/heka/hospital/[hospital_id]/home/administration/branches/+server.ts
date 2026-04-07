import { error, json, type RequestHandler } from '@sveltejs/kit';
import {
	createBranch,
	deleteBranch,
	getBranchById,
	getBranchesByHospitalId,
	getBranchesByHospitalIdPaginated,
	updateBranch
} from '$lib/server/heka/hospital-branch.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = String(event.params.hospital_id ?? '');
	if (!hospitalId) throw error(400, 'Missing hospital id');

	const mode = event.url.searchParams.get('mode') ?? 'paginated';
	if (mode === 'all') {
		const data = await getBranchesByHospitalId(event, { hospitalId });
		return json(data);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const statusIdStr = event.url.searchParams.get('statusId');
	const statusId =
		statusIdStr != null && statusIdStr !== '' ? Number(statusIdStr) : undefined;
	const id = event.url.searchParams.get('id');
	if (id) {
		const data = await getBranchById(event, { id });
		return json(data);
	}

	const data = await getBranchesByHospitalIdPaginated(event, {
		hospitalId,
		page,
		pageSize,
		statusId
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = String(event.params.hospital_id ?? '');
	if (!hospitalId) throw error(400, 'Missing hospital id');
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await createBranch(event, {
		hospitalId,
		name: String(body.name ?? ''),
		code: body.code != null ? String(body.code) : undefined,
		address: body.address != null ? String(body.address) : undefined,
		phone: body.phone != null ? String(body.phone) : undefined,
		email: body.email != null ? String(body.email) : undefined
	});
	return json(data);
};

export const PUT: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await updateBranch(event, {
		id: String(body.id ?? ''),
		name: body.name != null ? String(body.name) : undefined,
		code: body.code != null ? String(body.code) : undefined,
		address: body.address != null ? String(body.address) : undefined,
		phone: body.phone != null ? String(body.phone) : undefined,
		email: body.email != null ? String(body.email) : undefined
	});
	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	await deleteBranch(event, { id: String(body.id ?? '') });
	return json({ ok: true });
};

