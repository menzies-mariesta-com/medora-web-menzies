import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PageSchema,
	PageSchemaInsert,
	PageSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getPage = query(async (): Promise<PageSchema[]> => {
	const data = await ensureDb().select().from(table.pageTable);
	return data;
});

// get count
export const getPageCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.pageTable);
	return row?.count ?? 0;
});

// get paginated
export const getPagePaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<PageSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.pageTable)
				.limit(limit)
				.offset(offset),
			ensureDb().select({ count: count() }).from(table.pageTable)
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

// get one
export const getPageById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<PageSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.pageTable)
			.where(eq(table.pageTable.id, id));
		return row ?? null;
	}
);

// get all with related data (module, status, etc.)
export const getPageWithRelations = query(
	async () =>
		ensureDb().query.pageTable.findMany({
			with: {
				module: true,
				status: true
			}
		})
);

export type PageWithRelations = Awaited<
	ReturnType<typeof getPageWithRelations>
>[number];

// create
export const createPage = command(
	'unchecked' as const,
	async (payload: PageSchemaInsert): Promise<PageSchema> => {
		const [row] = await ensureDb()
			.insert(table.pageTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPage().refresh();
		return row;
	}
);

// update
export const updatePage = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		icon?: string | null;
		moduleId?: number | null;
		statusId?: number | null;
	}): Promise<PageSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.pageTable)
			.set(rest as PageSchemaUpdate)
			.where(eq(table.pageTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPage().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deletePage = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.pageTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.pageTable.id, id));
		getPage().refresh();
	}
);

// delete complete (hard)
export const deletePageComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.pageTable)
			.where(eq(table.pageTable.id, id));
		getPage().refresh();
	}
);
