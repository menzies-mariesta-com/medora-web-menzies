import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	CitySchema,
	CitySchemaInsert,
	CitySchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

export const getCity = query(async (): Promise<CitySchema[]> => {
	return ensureDb()
		.select()
		.from(table.cityTable)
		.where(ne(table.cityTable.statusId, StatusEnum.DELETED))
		.orderBy(table.cityTable.name);
});

export const getCityCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.cityTable)
		.where(ne(table.cityTable.statusId, StatusEnum.DELETED));
	return row?.count ?? 0;
});

export const getCityPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<CitySchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.cityTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.cityTable)
				.where(notDeletedFilter)
				.orderBy(table.cityTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.cityTable)
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

export const getCityById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<CitySchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.cityTable)
			.where(
				and(
					eq(table.cityTable.id, id),
					ne(table.cityTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

export const createCity = command(
	'unchecked' as const,
	async (payload: CitySchemaInsert): Promise<CitySchema> => {
		const [row] = await ensureDb()
			.insert(table.cityTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getCity().refresh();
		return row;
	}
);

export const updateCity = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string;
		code?: string;
		stateId?: number;
		statusId?: number;
	}): Promise<CitySchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.cityTable)
			.set(rest as CitySchemaUpdate)
			.where(eq(table.cityTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getCity().refresh();
		return row;
	}
);

export const deleteCity = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.cityTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.cityTable.id, id));
		getCity().refresh();
	}
);

export const deleteCityComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.cityTable)
			.where(eq(table.cityTable.id, id));
		getCity().refresh();
	}
);
