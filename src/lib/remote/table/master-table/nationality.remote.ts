import { prerender, query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	NationalitySchema,
	NationalitySchemaInsert,
	NationalitySchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

export const getNationality = prerender(
	async (): Promise<NationalitySchema[]> => {
		return ensureDb()
			.select()
			.from(table.nationalityTable)
			.where(ne(table.nationalityTable.statusId, StatusEnum.DELETED))
			.orderBy(table.nationalityTable.name);
	},
	{ dynamic: true }
);

export const getNationalityCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.nationalityTable)
			.where(ne(table.nationalityTable.statusId, StatusEnum.DELETED));
		return row?.count ?? 0;
	}
);

export const getNationalityPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<NationalitySchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.nationalityTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.nationalityTable)
				.where(notDeletedFilter)
				.orderBy(table.nationalityTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.nationalityTable)
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

export const getNationalityById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<NationalitySchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.nationalityTable)
			.where(
				and(
					eq(table.nationalityTable.id, id),
					ne(table.nationalityTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

export const createNationality = command(
	'unchecked' as const,
	async (
		payload: NationalitySchemaInsert
	): Promise<NationalitySchema> => {
		const [row] = await ensureDb()
			.insert(table.nationalityTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getNationality().refresh();
		return row;
	}
);

export const updateNationality = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		statusId?: number | null;
	}): Promise<NationalitySchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.nationalityTable)
			.set(rest as NationalitySchemaUpdate)
			.where(eq(table.nationalityTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getNationality().refresh();
		return row;
	}
);

export const deleteNationality = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.nationalityTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.nationalityTable.id, id));
		getNationality().refresh();
	}
);

export const deleteNationalityComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.nationalityTable)
			.where(eq(table.nationalityTable.id, id));
		getNationality().refresh();
	}
);
