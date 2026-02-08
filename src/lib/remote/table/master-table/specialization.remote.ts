import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { SpecializationSchema, SpecializationSchemaInsert, SpecializationSchemaUpdate } from '$lib/server/db/schema-type';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getSpecialization = query(async (): Promise<SpecializationSchema[]> => {
	const data = await ensureDb().select().from(table.specializationTable);
	return data;
});

// get count
export const getSpecializationCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.specializationTable);
	return row?.count ?? 0;
});

// get paginated
export const getSpecializationPaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<SpecializationSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.specializationTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.specializationTable),
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
export const getSpecializationById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<SpecializationSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.specializationTable)
			.where(eq(table.specializationTable.id, id));
		return row ?? null;
	}
);

// create
export const createSpecialization = command(
	'unchecked' as const,
	async (payload: SpecializationSchemaInsert): Promise<SpecializationSchema> => {
		const [row] = await ensureDb()
			.insert(table.specializationTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getSpecialization().refresh();
		return row;
	}
);

// update
export const updateSpecialization = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string }): Promise<SpecializationSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.specializationTable)
			.set(rest as SpecializationSchemaUpdate)
			.where(eq(table.specializationTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getSpecialization().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deleteSpecialization = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.specializationTable).where(eq(table.specializationTable.id, id));
		getSpecialization().refresh();
	}
);

// delete complete (hard)
export const deleteSpecializationComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.specializationTable).where(eq(table.specializationTable.id, id));
		getSpecialization().refresh();
	}
);
