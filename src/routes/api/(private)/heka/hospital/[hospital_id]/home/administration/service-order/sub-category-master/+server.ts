import { error, json, type RequestHandler } from '@sveltejs/kit';
import {
	createSubCategory,
	deleteSubCategory,
	getSubCategories,
	getSubCategoriesPaginated,
	updateSubCategory
} from '$lib/server/heka/administration/service-order/sub-category.server';

function parseNumberOrNull(value: string | null): number | null {
	if (value == null || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function parseNumberList(value: string | null): number[] | null {
	if (value == null || value.trim() === '') return null;
	const nums = value
		.split(',')
		.map((s) => Number(s.trim()))
		.filter((n) => Number.isFinite(n));
	return nums;
}

export const GET: RequestHandler = async (event) => {
	const hospitalId = String(event.params.hospital_id ?? '');
	if (!hospitalId) throw error(400, 'Missing hospital id');
	void hospitalId;

	const mode = event.url.searchParams.get('mode') ?? 'paginated';
	if (mode === 'all') {
		const categoryId = parseNumberOrNull(
			event.url.searchParams.get('categoryId')
		);
		const categoryIds = parseNumberList(
			event.url.searchParams.get('categoryIds')
		);
		const data = await getSubCategories(event, { categoryId, categoryIds });
		return json(data);
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '10');
	const statusId = parseNumberOrNull(
		event.url.searchParams.get('statusId')
	);
	const id = parseNumberOrNull(event.url.searchParams.get('id'));
	const subCategoryName = event.url.searchParams.get('subCategoryName');

	const categoryIds = parseNumberList(
		event.url.searchParams.get('categoryIds')
	);

	const data = await getSubCategoriesPaginated(event, {
		page,
		pageSize,
		categoryIds,
		id,
		subCategoryName: subCategoryName?.trim() || null,
		statusId: statusId ?? undefined
	});
	return json(data);
};

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await createSubCategory(event, {
		categoryId: Number(body.categoryId),
		subCategoryName: String(body.subCategoryName ?? ''),
		statusId: Number(body.statusId ?? 1)
	} as any);
	return json(data);
};

export const PUT: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	const data = await updateSubCategory(event, {
		id: Number(body.id),
		subCategoryName:
			body.subCategoryName != null
				? String(body.subCategoryName)
				: undefined,
		statusId: body.statusId != null ? Number(body.statusId) : undefined
	} as any);
	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	const body = (await event.request.json()) as Record<string, unknown>;
	await deleteSubCategory(event, { id: Number(body.id) });
	return json({ ok: true });
};

