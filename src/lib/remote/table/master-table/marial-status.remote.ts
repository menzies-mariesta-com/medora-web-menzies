import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	MaritalStatusSchema,
	MaritalStatusSchemaInsert,
	MaritalStatusSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

export const getMaritalStatus = query(
	async (): Promise<MaritalStatusSchema[]> => {
		return ensureDb()
			.select()
			.from(table.maritalStatusTable)
			.where(eq(table.maritalStatusTable.statusId, StatusEnum.ACTIVE))
			.orderBy(table.maritalStatusTable.name);
	}
);

export const getMaritalStatusCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.maritalStatusTable)
			.where(
				eq(table.maritalStatusTable.statusId, StatusEnum.ACTIVE)
			);
		return row?.count ?? 0;
	}
);

export const getMaritalStatusPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<MaritalStatusSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const activeFilter = eq(
			table.maritalStatusTable.statusId,
			StatusEnum.ACTIVE
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.maritalStatusTable)
				.where(activeFilter)
				.orderBy(table.maritalStatusTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.maritalStatusTable)
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

export const getMaritalStatusById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<MaritalStatusSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.maritalStatusTable)
			.where(eq(table.maritalStatusTable.id, id));
		return row ?? null;
	}
);

export const createMaritalStatus = command(
	'unchecked' as const,
	async (
		payload: MaritalStatusSchemaInsert
	): Promise<MaritalStatusSchema> => {
		const [row] = await ensureDb()
			.insert(table.maritalStatusTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getMaritalStatus().refresh();
		return row;
	}
);

export const updateMaritalStatus = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string;
	}): Promise<MaritalStatusSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.maritalStatusTable)
			.set(rest as MaritalStatusSchemaUpdate)
			.where(eq(table.maritalStatusTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getMaritalStatus().refresh();
		return row;
	}
);

export const deleteMaritalStatus = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.maritalStatusTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.maritalStatusTable.id, id));
		getMaritalStatus().refresh();
	}
);

export const deleteMaritalStatusComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.maritalStatusTable)
			.where(eq(table.maritalStatusTable.id, id));
		getMaritalStatus().refresh();
	}
);
