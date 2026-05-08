import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, ilike, inArray, ne } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	SubCategorySchema,
	SubCategorySchemaInsert,
	SubCategorySchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';

function ensureAuthed(event: RequestEvent): void {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
}

export async function getSubCategories(
	event: RequestEvent,
	params?: { categoryId?: number | null; categoryIds?: number[] | null }
): Promise<SubCategorySchema[]> {
	ensureAuthed(event);
	let whereExpr: SQL = ne(table.subCategoryTable.statusId, StatusEnum.DELETED);

	if (params?.categoryId != null) {
		whereExpr = and(
			whereExpr,
			eq(table.subCategoryTable.categoryId, params.categoryId)
		)!;
	}

	if (params?.categoryIds != null) {
		if (params.categoryIds.length === 0) return [];
		whereExpr = and(
			whereExpr,
			inArray(table.subCategoryTable.categoryId, params.categoryIds)
		)!;
	}

	return ensureDb()
		.select()
		.from(table.subCategoryTable)
		.where(whereExpr)
		.orderBy(table.subCategoryTable.subCategoryName);
}

export async function getSubCategoriesPaginated(
	event: RequestEvent,
	params: PaginationParams & {
		categoryId?: number | null;
		categoryIds?: number[] | null;
		id?: number | null;
		subCategoryName?: string | null;
		statusId?: number | null;
	}
): Promise<PaginatedResult<SubCategorySchema>> {
	ensureAuthed(event);
	const { page, pageSize, limit, offset } = normalizePagination(params);

	let whereExpr: SQL = ne(table.subCategoryTable.statusId, StatusEnum.DELETED);

	if (params.categoryId != null) {
		whereExpr = and(
			whereExpr,
			eq(table.subCategoryTable.categoryId, params.categoryId)
		)!;
	}

	if (params.categoryIds != null) {
		if (params.categoryIds.length === 0) {
			return { data: [], total: 0, page, pageSize, totalPages: 1 };
		}
		whereExpr = and(
			whereExpr,
			inArray(table.subCategoryTable.categoryId, params.categoryIds)
		)!;
	}

	if (params.id != null) {
		whereExpr = and(whereExpr, eq(table.subCategoryTable.id, params.id))!;
	}

	const nameTerm = params.subCategoryName?.trim();
	if (nameTerm) {
		whereExpr = and(
			whereExpr,
			ilike(table.subCategoryTable.subCategoryName, `%${nameTerm}%`)
		)!;
	}

	if (params.statusId != null) {
		whereExpr = and(
			whereExpr,
			eq(table.subCategoryTable.statusId, params.statusId)
		)!;
	}

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.subCategoryTable)
			.where(whereExpr)
			.orderBy(desc(table.subCategoryTable.id))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.subCategoryTable)
			.where(whereExpr)
	]);

	const total = countResult[0]?.count ?? 0;
	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function createSubCategory(
	event: RequestEvent,
	input: SubCategorySchemaInsert
): Promise<SubCategorySchema> {
	ensureAuthed(event);
	const [row] = await ensureDb()
		.insert(table.subCategoryTable)
		.values(input)
		.returning();
	if (!row) throw new Error('Failed to create sub-category');
	return row;
}

export async function updateSubCategory(
	event: RequestEvent,
	input: SubCategorySchemaUpdate & { id: number }
): Promise<SubCategorySchema> {
	ensureAuthed(event);
	const { id, ...data } = input;
	const [row] = await ensureDb()
		.update(table.subCategoryTable)
		.set(data)
		.where(eq(table.subCategoryTable.id, id))
		.returning();
	if (!row) throw error(404, 'Sub-category not found');
	return row;
}

export async function deleteSubCategory(
	event: RequestEvent,
	input: { id: number }
): Promise<void> {
	ensureAuthed(event);
	const [existing] = await ensureDb()
		.select({ id: table.subCategoryTable.id })
		.from(table.subCategoryTable)
		.where(eq(table.subCategoryTable.id, input.id))
		.limit(1);
	if (!existing) throw error(404, 'Sub-category not found');

	await ensureDb()
		.update(table.subCategoryTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.subCategoryTable.id, input.id));
}

