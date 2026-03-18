import { prerender, query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	CraftGroupSchema,
	CraftGroupSchemaInsert,
	CraftGroupSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

export const getCraftGroup = prerender(
	async (): Promise<CraftGroupSchema[]> => {
		return ensureDb()
			.select()
			.from(table.craftGroupTable)
			.where(ne(table.craftGroupTable.statusId, StatusEnum.DELETED))
			.orderBy(table.craftGroupTable.name);
	},
	{ dynamic: true }
);

export const getCraftGroupCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.craftGroupTable)
		.where(ne(table.craftGroupTable.statusId, StatusEnum.DELETED));
	return row?.count ?? 0;
});

export const getCraftGroupPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<CraftGroupSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.craftGroupTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.craftGroupTable)
				.where(notDeletedFilter)
				.orderBy(table.craftGroupTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.craftGroupTable)
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

export const getCraftGroupById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<CraftGroupSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.craftGroupTable)
			.where(
				and(
					eq(table.craftGroupTable.id, id),
					ne(table.craftGroupTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

export const createCraftGroup = command(
	'unchecked' as const,
	async (
		payload: CraftGroupSchemaInsert
	): Promise<CraftGroupSchema> => {
		const [row] = await ensureDb()
			.insert(table.craftGroupTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getCraftGroup().refresh();
		return row;
	}
);

export const updateCraftGroup = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string;
	}): Promise<CraftGroupSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.craftGroupTable)
			.set(rest as CraftGroupSchemaUpdate)
			.where(eq(table.craftGroupTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getCraftGroup().refresh();
		return row;
	}
);

export const deleteCraftGroup = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.craftGroupTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.craftGroupTable.id, id));
		getCraftGroup().refresh();
	}
);

export const deleteCraftGroupComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.craftGroupTable)
			.where(eq(table.craftGroupTable.id, id));
		getCraftGroup().refresh();
	}
);
