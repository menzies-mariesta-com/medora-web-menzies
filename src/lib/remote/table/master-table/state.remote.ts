import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StateSchema, StateSchemaInsert, StateSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

export const getState = query(async (): Promise<StateSchema[]> => {
	return ensureDb()
		.select()
		.from(table.stateTable)
		.where(eq(table.stateTable.statusId, StatusEnum.ACTIVE))
		.orderBy(table.stateTable.name);
});

export const getStateCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.stateTable)
		.where(eq(table.stateTable.statusId, StatusEnum.ACTIVE));
	return row?.count ?? 0;
});

export const getStatePaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<StateSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const activeFilter = eq(table.stateTable.statusId, StatusEnum.ACTIVE);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.stateTable)
				.where(activeFilter)
				.orderBy(table.stateTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.stateTable)
				.where(activeFilter),
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

export const getStateById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StateSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.stateTable)
			.where(eq(table.stateTable.id, id));
		return row ?? null;
	}
);

export const createState = command(
	'unchecked' as const,
	async (payload: StateSchemaInsert): Promise<StateSchema> => {
		const [row] = await ensureDb()
			.insert(table.stateTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getState().refresh();
		return row;
	}
);

export const updateState = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string;
		code?: string | null;
		countryId?: number | null;
		statusId?: number | null;
	}): Promise<StateSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.stateTable)
			.set(rest as StateSchemaUpdate)
			.where(eq(table.stateTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getState().refresh();
		return row;
	}
);

export const deleteState = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.stateTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.stateTable.id, id));
		getState().refresh();
	}
);

export const deleteStateComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.stateTable).where(eq(table.stateTable.id, id));
		getState().refresh();
	}
);
