import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ReferTypeSchema,
	ReferTypeSchemaInsert,
	ReferTypeSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getReferType = query(async (): Promise<ReferTypeSchema[]> => {
	const data = await ensureDb().select().from(table.referTypeTable);
	return data;
});

// get count
export const getReferTypeCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.referTypeTable);
	return row?.count ?? 0;
});

// get paginated
export const getReferTypePaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<ReferTypeSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.referTypeTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.referTypeTable),
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
export const getReferTypeById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<ReferTypeSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.referTypeTable)
			.where(eq(table.referTypeTable.id, id));
		return row ?? null;
	}
);

// create
export const createReferType = command(
	'unchecked' as const,
	async (payload: ReferTypeSchemaInsert): Promise<ReferTypeSchema> => {
		const [row] = await ensureDb()
			.insert(table.referTypeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getReferType().refresh();
		return row;
	}
);

// update
export const updateReferType = command(
	'unchecked' as const,
	async (payload: ReferTypeSchemaUpdate & { id: number }): Promise<ReferTypeSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.referTypeTable)
			.set(rest as ReferTypeSchemaUpdate)
			.where(eq(table.referTypeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getReferType().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteReferType = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.referTypeTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.referTypeTable.id, id));
		getReferType().refresh();
	}
);

// delete complete (hard)
export const deleteReferTypeComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.referTypeTable).where(eq(table.referTypeTable.id, id));
		getReferType().refresh();
	}
);
