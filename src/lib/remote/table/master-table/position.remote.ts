import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PositionSchema,
	PositionSchemaInsert,
	PositionSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

export const getPosition = query(
	async (): Promise<PositionSchema[]> => {
		return ensureDb()
			.select()
			.from(table.positionTable)
			.where(ne(table.positionTable.statusId, StatusEnum.DELETED))
			.orderBy(table.positionTable.name);
	}
);

export const getPositionCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.positionTable)
		.where(ne(table.positionTable.statusId, StatusEnum.DELETED));
	return row?.count ?? 0;
});

export const getPositionPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<PositionSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.positionTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.positionTable)
				.where(notDeletedFilter)
				.orderBy(table.positionTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.positionTable)
				.where(notDeletedFilter)
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
);

export const getPositionById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<PositionSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.positionTable)
			.where(
				and(
					eq(table.positionTable.id, id),
					ne(table.positionTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

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

export const updatePosition = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		statusId?: number | null;
	}): Promise<PositionSchema> => {
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

export const deletePositionComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.positionTable)
			.where(eq(table.positionTable.id, id));
		getPosition().refresh();
	}
);
