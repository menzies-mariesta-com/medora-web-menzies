import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	TitleSchema,
	TitleSchemaInsert,
	TitleSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

export const getTitle = query(async (): Promise<TitleSchema[]> => {
	return ensureDb()
		.select()
		.from(table.titleTable)
		.where(eq(table.titleTable.statusId, StatusEnum.ACTIVE))
		.orderBy(table.titleTable.name);
});

export const getTitleCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.titleTable)
		.where(eq(table.titleTable.statusId, StatusEnum.ACTIVE));
	return row?.count ?? 0;
});

export const getTitlePaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<TitleSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const activeFilter = eq(
			table.titleTable.statusId,
			StatusEnum.ACTIVE
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.titleTable)
				.where(activeFilter)
				.orderBy(table.titleTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.titleTable)
				.where(activeFilter)
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

export const updateTitle = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		statusId?: number | null;
	}): Promise<TitleSchema> => {
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

export const deleteTitleComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.titleTable)
			.where(eq(table.titleTable.id, id));
		getTitle().refresh();
	}
);
