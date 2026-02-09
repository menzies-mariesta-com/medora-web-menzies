import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PositionSchema,
	PositionSchemaInsert,
	PositionSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getPosition = query(async (): Promise<PositionSchema[]> => {
	const data = await ensureDb().select().from(table.positionTable);
	return data;
});

// get count
export const getPositionCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.positionTable);
	return row?.count ?? 0;
});

// get paginated
export const getPositionPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<PositionSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.positionTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.positionTable),
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
export const getPositionById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<PositionSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.positionTable)
			.where(eq(table.positionTable.id, id));
		return row ?? null;
	}
);

// create
export const createPosition = command(
	'unchecked' as const,
	async (payload: PositionSchemaInsert): Promise<PositionSchema> => {
		const [row] = await ensureDb()
			.insert(table.positionTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPosition().refresh();
		return row;
	}
);

// update
export const updatePosition = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string | null; statusId?: number | null }): Promise<PositionSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.positionTable)
			.set(rest as PositionSchemaUpdate)
			.where(eq(table.positionTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPosition().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deletePosition = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.positionTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.positionTable.id, id));
		getPosition().refresh();
	}
);

// delete complete (hard)
export const deletePositionComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.positionTable).where(eq(table.positionTable.id, id));
		getPosition().refresh();
	}
);
