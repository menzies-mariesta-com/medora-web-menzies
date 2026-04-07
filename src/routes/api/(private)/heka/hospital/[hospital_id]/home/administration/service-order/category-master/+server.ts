import { error, json, type RequestHandler } from '@sveltejs/kit';
import {
	createCategory,
	deleteCategory,
	getCategories,
	getCategoriesPaginated,
	updateCategory
} from '$lib/server/heka/administration/service-order/category.server';

export const GET: RequestHandler = async (event) => {
	const hospitalId = String(event.params.hospital_id ?? '');
	if (!hospitalId) throw error(400, 'Missing hospital id');
	void hospitalId;

	const mode = event.url.searchParams.get('mode') ?? 'paginated';
	if (mode === 'all') {
		const data = await getCategories(event);
		return json(data);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const statusIdStr = event.url.searchParams.get('statusId');
	const statusId =
		statusIdStr != null && statusIdStr !== '' ? Number(statusIdStr) : null;

	const idStr = event.url.searchParams.get('id');
	const id = idStr != null && idStr !== '' ? Number(idStr) : null;
	const categoryName = event.url.searchParams.get('categoryName');

	const data = await getCategoriesPaginated(event, {
		page,
		pageSize,
		id: id != null && Number.isFinite(id) ? id : undefined,
		categoryName: categoryName?.trim() || null,
		statusId:
			statusId != null && Number.isFinite(statusId) ? statusId : undefined
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await createCategory(event, {
		categoryName: String(body.categoryName ?? ''),
		statusId: Number(body.statusId ?? 1)
	} as any);
	return json(data);
};

export const PUT: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await updateCategory(event, {
		id: Number(body.id),
		categoryName:
			body.categoryName != null ? String(body.categoryName) : undefined,
		statusId: body.statusId != null ? Number(body.statusId) : undefined
	} as any);
	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	await deleteCategory(event, { id: Number(body.id) });
	return json({ ok: true });
};

