import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, ilike, ne } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	CategorySchema,
	CategorySchemaInsert,
	CategorySchemaUpdate
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

export async function getCategories(
	event: RequestEvent
): Promise<CategorySchema[]> {
	ensureAuthed(event);
	return ensureDb()
		.select()
		.from(table.categoryTable)
		.where(ne(table.categoryTable.statusId, StatusEnum.DELETED))
		.orderBy(table.categoryTable.categoryName);
}

export async function getCategoriesPaginated(
	event: RequestEvent,
	params: PaginationParams & {
		id?: number | null;
		categoryName?: string | null;
		statusId?: number | null;
	}
): Promise<PaginatedResult<CategorySchema>> {
	ensureAuthed(event);
	const { page, pageSize, limit, offset } =
		normalizePagination(params);

	let whereExpr: SQL = ne(
		table.categoryTable.statusId,
		StatusEnum.DELETED
	);

	if (params.id != null) {
		whereExpr = and(
			whereExpr,
			eq(table.categoryTable.id, params.id)
		)!;
	}

	const nameTerm = params.categoryName?.trim();
	if (nameTerm) {
		whereExpr = and(
			whereExpr,
			ilike(table.categoryTable.categoryName, `%${nameTerm}%`)
		)!;
	}

	if (params.statusId != null) {
		whereExpr = and(
			whereExpr,
			eq(table.categoryTable.statusId, params.statusId)
		)!;
	}

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.categoryTable)
			.where(whereExpr)
			.orderBy(desc(table.categoryTable.id))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.categoryTable)
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

export async function createCategory(
	event: RequestEvent,
	input: CategorySchemaInsert
): Promise<CategorySchema> {
	ensureAuthed(event);
	const [row] = await ensureDb()
		.insert(table.categoryTable)
		.values(input)
		.returning();
	if (!row) throw new Error('Failed to create category');
	return row;
}

export async function updateCategory(
	event: RequestEvent,
	input: CategorySchemaUpdate & { id: number }
): Promise<CategorySchema> {
	ensureAuthed(event);
	const { id, ...data } = input;
	const [row] = await ensureDb()
		.update(table.categoryTable)
		.set(data)
		.where(eq(table.categoryTable.id, id))
		.returning();
	if (!row) throw error(404, 'Category not found');
	return row;
}

export async function deleteCategory(
	event: RequestEvent,
	input: { id: number }
): Promise<void> {
	ensureAuthed(event);
	const [existing] = await ensureDb()
		.select({ id: table.categoryTable.id })
		.from(table.categoryTable)
		.where(eq(table.categoryTable.id, input.id))
		.limit(1);
	if (!existing) throw error(404, 'Category not found');

	await ensureDb()
		.update(table.categoryTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.categoryTable.id, input.id));
}
