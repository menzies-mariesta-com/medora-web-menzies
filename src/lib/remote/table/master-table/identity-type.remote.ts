import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { IdentityTypeSchema, IdentityTypeSchemaInsert, IdentityTypeSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

export const getIdentityType = query(async (): Promise<IdentityTypeSchema[]> => {
	return ensureDb()
		.select()
		.from(table.identityTypeTable)
		.where(eq(table.identityTypeTable.statusId, StatusEnum.ACTIVE))
		.orderBy(table.identityTypeTable.name);
});

export const getIdentityTypeCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.identityTypeTable)
		.where(eq(table.identityTypeTable.statusId, StatusEnum.ACTIVE));
	return row?.count ?? 0;
});

export const getIdentityTypePaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<IdentityTypeSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const activeFilter = eq(table.identityTypeTable.statusId, StatusEnum.ACTIVE);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.identityTypeTable)
				.where(activeFilter)
				.orderBy(table.identityTypeTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.identityTypeTable)
				.where(activeFilter),
		]);
		const total = countResult[0]?.count ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1,
		};
	}
);

export const getIdentityTypeById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<IdentityTypeSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.identityTypeTable)
			.where(eq(table.identityTypeTable.id, id));
		return row ?? null;
	}
);

export const createIdentityType = command(
	'unchecked' as const,
	async (payload: IdentityTypeSchemaInsert): Promise<IdentityTypeSchema> => {
		const [row] = await ensureDb()
			.insert(table.identityTypeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getIdentityType().refresh();
		return row;
	}
);

export const updateIdentityType = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string }): Promise<IdentityTypeSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.identityTypeTable)
			.set(rest as IdentityTypeSchemaUpdate)
			.where(eq(table.identityTypeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getIdentityType().refresh();
		return row;
	}
);

export const deleteIdentityType = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.identityTypeTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.identityTypeTable.id, id));
		getIdentityType().refresh();
	}
);

export const deleteIdentityTypeComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.identityTypeTable).where(eq(table.identityTypeTable.id, id));
		getIdentityType().refresh();
	}
);
