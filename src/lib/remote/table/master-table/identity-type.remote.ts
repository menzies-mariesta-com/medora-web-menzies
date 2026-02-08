import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { IdentityTypeSchema, IdentityTypeSchemaInsert, IdentityTypeSchemaUpdate } from '$lib/server/db/schema-type';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getIdentityType = query(async (): Promise<IdentityTypeSchema[]> => {
	const data = await ensureDb().select().from(table.identityTypeTable);
	return data;
});

// get count
export const getIdentityTypeCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.identityTypeTable);
	return row?.count ?? 0;
});

// get paginated
export const getIdentityTypePaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<IdentityTypeSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.identityTypeTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.identityTypeTable),
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

// get one
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

// create
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

// update
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

// delete (no status_id: hard delete)
export const deleteIdentityType = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.identityTypeTable).where(eq(table.identityTypeTable.id, id));
		getIdentityType().refresh();
	}
);

// delete complete (hard)
export const deleteIdentityTypeComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.identityTypeTable).where(eq(table.identityTypeTable.id, id));
		getIdentityType().refresh();
	}
);
