import { prerender, query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PostalCodeSchema,
	PostalCodeSchemaInsert,
	PostalCodeSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

export const getPostalCode = prerender(
	async (): Promise<PostalCodeSchema[]> => {
		return ensureDb()
			.select()
			.from(table.postalCodeTable)
			.where(ne(table.postalCodeTable.statusId, StatusEnum.DELETED))
			.orderBy(table.postalCodeTable.value);
	},
	{ dynamic: true }
);

export const getPostalCodeCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.postalCodeTable)
		.where(ne(table.postalCodeTable.statusId, StatusEnum.DELETED));
	return row?.count ?? 0;
});

export const getPostalCodePaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<PostalCodeSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.postalCodeTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.postalCodeTable)
				.where(notDeletedFilter)
				.orderBy(table.postalCodeTable.value)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.postalCodeTable)
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

export const getPostalCodeById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<PostalCodeSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.postalCodeTable)
			.where(
				and(
					eq(table.postalCodeTable.id, id),
					ne(table.postalCodeTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

export const createPostalCode = command(
	'unchecked' as const,
	async (
		payload: PostalCodeSchemaInsert
	): Promise<PostalCodeSchema> => {
		const [row] = await ensureDb()
			.insert(table.postalCodeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPostalCode().refresh();
		return row;
	}
);

export const updatePostalCode = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		value?: number;
		cityId?: number;
		statusId?: number | null;
	}): Promise<PostalCodeSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.postalCodeTable)
			.set(rest as PostalCodeSchemaUpdate)
			.where(eq(table.postalCodeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPostalCode().refresh();
		return row;
	}
);

export const deletePostalCode = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.postalCodeTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.postalCodeTable.id, id));
		getPostalCode().refresh();
	}
);

export const deletePostalCodeComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.postalCodeTable)
			.where(eq(table.postalCodeTable.id, id));
		getPostalCode().refresh();
	}
);
