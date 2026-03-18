import { prerender, query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	WeekdaySchema,
	WeekdaySchemaInsert,
	WeekdaySchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

export const getWeekday = prerender(
	async (): Promise<WeekdaySchema[]> => {
		return ensureDb()
			.select()
			.from(table.weekdayTable)
			.where(ne(table.weekdayTable.statusId, StatusEnum.DELETED))
			.orderBy(table.weekdayTable.id);
	},
	{ dynamic: true }
);

export const getWeekdayCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.weekdayTable)
		.where(ne(table.weekdayTable.statusId, StatusEnum.DELETED));
	return row?.count ?? 0;
});

export const getWeekdayPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<WeekdaySchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.weekdayTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.weekdayTable)
				.where(notDeletedFilter)
				.orderBy(table.weekdayTable.id)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.weekdayTable)
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

export const getWeekdayById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<WeekdaySchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.weekdayTable)
			.where(
				and(
					eq(table.weekdayTable.id, id),
					ne(table.weekdayTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

export const createWeekday = command(
	'unchecked' as const,
	async (payload: WeekdaySchemaInsert): Promise<WeekdaySchema> => {
		const [row] = await ensureDb()
			.insert(table.weekdayTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getWeekday().refresh();
		return row;
	}
);

export const updateWeekday = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		statusId?: number | null;
	}): Promise<WeekdaySchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.weekdayTable)
			.set(rest as WeekdaySchemaUpdate)
			.where(eq(table.weekdayTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getWeekday().refresh();
		return row;
	}
);

export const deleteWeekday = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.weekdayTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.weekdayTable.id, id));
		getWeekday().refresh();
	}
);

export const deleteWeekdayComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.weekdayTable)
			.where(eq(table.weekdayTable.id, id));
		getWeekday().refresh();
	}
);
