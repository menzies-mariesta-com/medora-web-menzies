import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StatusSchema,
	StatusSchemaInsert,
	StatusSchemaUpdate
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { and, count, eq, ne } from 'drizzle-orm';

export const getStatus = query(async (): Promise<StatusSchema[]> => {
	const whereExpr = ne(table.statusTable.id, StatusEnum.DELETED);
	return ensureDb()
		.select()
		.from(table.statusTable)
		.where(whereExpr)
		.orderBy(table.statusTable.name);
});

export const getStatusCount = query(async (): Promise<number> => {
	const whereExpr = ne(table.statusTable.id, StatusEnum.DELETED);
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.statusTable)
		.where(whereExpr);
	return row?.count ?? 0;
});

export const getStatusPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<StatusSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const whereExpr = ne(table.statusTable.id, StatusEnum.DELETED);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.statusTable)
				.where(whereExpr)
				.orderBy(table.statusTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.statusTable)
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
);

export const getStatusById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StatusSchema | null> => {
		const whereExpr = and(
			eq(table.statusTable.id, id),
			ne(table.statusTable.id, StatusEnum.DELETED)
		);
		const [row] = await ensureDb()
			.select()
			.from(table.statusTable)
			.where(whereExpr);
		return row ?? null;
	}
);

export const createStatus = command(
	'unchecked' as const,
	async (payload: StatusSchemaInsert): Promise<StatusSchema> => {
		const [row] = await ensureDb()
			.insert(table.statusTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStatus().refresh();
		return row;
	}
);

export const updateStatus = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string;
	}): Promise<StatusSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.statusTable)
			.set(rest as StatusSchemaUpdate)
			.where(eq(table.statusTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStatus().refresh();
		return row;
	}
);

export const deleteStatus = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.statusTable)
			.where(eq(table.statusTable.id, id));
		getStatus().refresh();
	}
);

export const deleteStatusComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.statusTable)
			.where(eq(table.statusTable.id, id));
		getStatus().refresh();
	}
);
