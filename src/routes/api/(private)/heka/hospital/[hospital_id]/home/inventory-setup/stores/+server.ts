import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createStore,
	deleteStore,
	getStoreById,
	getStoreLookups,
	getStoresPaginated,
	updateStore
} from '$lib/server/heka/administration/store.server';

function parseUserGroupIds(raw: unknown): number[] | undefined {
	if (raw === undefined) return undefined;
	if (raw === null) return [];
	if (!Array.isArray(raw)) return [];
	const out: number[] = [];
	for (const v of raw) {
		const n = Number(v);
		if (Number.isFinite(n) && n > 0) out.push(n);
	}
	return out;
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const mode = event.url.searchParams.get('mode') ?? 'paginated';

	if (mode === 'lookups') {
		const data = await getStoreLookups(event, { hospitalId });
		return json(data);
	}

	const idStr = event.url.searchParams.get('id');
	if (idStr) {
		const id = Number(idStr);
		const data = Number.isFinite(id)
			? await getStoreById(event, { hospitalId, id })
			: null;
		return json(data);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const name = event.url.searchParams.get('name') ?? undefined;
	const statusIdStr = event.url.searchParams.get('statusId');
	const statusId =
		statusIdStr != null && statusIdStr !== '' ? Number(statusIdStr) : undefined;

	const data = await getStoresPaginated(event, {
		hospitalId,
		page,
		pageSize,
		name,
		statusId
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;

	const data = await createStore(event, {
		hospitalId,
		branchId: String(body.branchId ?? ''),
		storeName: body.storeName != null ? String(body.storeName) : null,
		remark: body.remark != null ? String(body.remark) : null,
		isPurchaseRequisitable:
			body.isPurchaseRequisitable === true ||
			body.isPurchaseRequisitable === 'true',
		userGroupIds: parseUserGroupIds(body.userGroupIds) ?? [],
		statusId:
			body.statusId != null && body.statusId !== ''
				? Number(body.statusId)
				: undefined
	});

	return json(data);
};

export const PUT: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;

	const data = await updateStore(event, {
		hospitalId,
		id: Number(body.id ?? 0),
		branchId: body.branchId != null ? String(body.branchId) : undefined,
		storeName: body.storeName != null ? String(body.storeName) : undefined,
		remark: body.remark != null ? String(body.remark) : undefined,
		isPurchaseRequisitable:
			body.isPurchaseRequisitable === undefined
				? undefined
				: body.isPurchaseRequisitable === true ||
					body.isPurchaseRequisitable === 'true',
		userGroupIds: parseUserGroupIds(body.userGroupIds),
		statusId:
			body.statusId !== undefined
				? body.statusId == null || body.statusId === ''
					? undefined
					: Number(body.statusId)
				: undefined
	});

	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	const hospitalId = event.params.hospital_id;
	const body = (await event.request.json()) as Record<string, unknown>;
	await deleteStore(event, { hospitalId, id: Number(body.id ?? 0) });
	return json({ ok: true });
};
