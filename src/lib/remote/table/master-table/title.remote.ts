import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { TitleSchema, TitleSchemaInsert, TitleSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getTitle = query(async (): Promise<TitleSchema[]> => {
	const data = await ensureDb().select().from(table.titleTable);
	return data;
});

// get count
export const getTitleCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.titleTable);
	return row?.count ?? 0;
});

// get paginated
export const getTitlePaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<TitleSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.titleTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.titleTable),
		]);
		const total = countResult[0]?.count ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1,
		};
	}
);

// get one
export const getTitleById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<TitleSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.titleTable)
			.where(eq(table.titleTable.id, id));
		return row ?? null;
	}
);

// create
export const createTitle = command(
	'unchecked' as const,
	async (payload: TitleSchemaInsert): Promise<TitleSchema> => {
		const [row] = await ensureDb()
			.insert(table.titleTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getTitle().refresh();
		return row;
	}
);

// update
export const updateTitle = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string | null; statusId?: number | null }): Promise<TitleSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.titleTable)
			.set(rest as TitleSchemaUpdate)
			.where(eq(table.titleTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getTitle().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteTitle = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.titleTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.titleTable.id, id));
		getTitle().refresh();
	}
);

// delete complete (hard)
export const deleteTitleComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.titleTable).where(eq(table.titleTable.id, id));
		getTitle().refresh();
	}
);
