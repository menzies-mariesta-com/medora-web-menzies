import { prerender, query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	CountrySchema,
	CountrySchemaInsert,
	CountrySchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

// get all
export const getCountry = prerender(
	async (): Promise<CountrySchema[]> => {
		return ensureDb()
			.select()
			.from(table.countryTable)
			.where(ne(table.countryTable.statusId, StatusEnum.DELETED))
			.orderBy(table.countryTable.name);
	},
	{ dynamic: true }
);

// get count
export const getCountryCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.countryTable)
		.where(ne(table.countryTable.statusId, StatusEnum.DELETED));
	return row?.count ?? 0;
});

// get paginated
export const getCountryPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<CountrySchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.countryTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.countryTable)
				.where(notDeletedFilter)
				.orderBy(table.countryTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.countryTable)
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

// get one
export const getCountryById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<CountrySchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.countryTable)
			.where(
				and(
					eq(table.countryTable.id, id),
					ne(table.countryTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

// create
export const createCountry = command(
	'unchecked' as const,
	async (payload: CountrySchemaInsert): Promise<CountrySchema> => {
		const [row] = await ensureDb()
			.insert(table.countryTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getCountry().refresh();
		return row;
	}
);

// update
export const updateCountry = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string;
		code?: string;
		imgUrl?: string;
		language?: string;
		countryCallingCode?: string;
		statusId?: number;
	}): Promise<CountrySchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.countryTable)
			.set(rest as CountrySchemaUpdate)
			.where(eq(table.countryTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getCountry().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteCountry = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.countryTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.countryTable.id, id));
		getCountry().refresh();
	}
);

// delete complete (hard)
export const deleteCountryComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.countryTable)
			.where(eq(table.countryTable.id, id));
		getCountry().refresh();
	}
);
