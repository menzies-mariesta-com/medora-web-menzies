import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { GenderSchema, GenderSchemaInsert, GenderSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getGender = query(async (): Promise<GenderSchema[]> => {
	const data = await ensureDb().select().from(table.genderTable);
	return data;
});

// get count
export const getGenderCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.genderTable);
	return row?.count ?? 0;
});

// get paginated
export const getGenderPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<GenderSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.genderTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.genderTable),
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
export const getGenderById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<GenderSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.genderTable)
			.where(eq(table.genderTable.id, id));
		return row ?? null;
	}
);

// create
export const createGender = command(
	'unchecked' as const,
	async (payload: GenderSchemaInsert): Promise<GenderSchema> => {
		const [row] = await ensureDb()
			.insert(table.genderTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getGender().refresh();
		return row;
	}
);

// update
export const updateGender = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string; statusId?: number | null }): Promise<GenderSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.genderTable)
			.set(rest as GenderSchemaUpdate)
			.where(eq(table.genderTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getGender().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteGender = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.genderTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.genderTable.id, id));
		getGender().refresh();
	}
);

// delete complete (hard)
export const deleteGenderComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.genderTable).where(eq(table.genderTable.id, id));
		getGender().refresh();
	}
);
