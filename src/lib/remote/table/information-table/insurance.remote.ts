import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	InsuranceSchema,
	InsuranceSchemaInsert,
	InsuranceSchemaUpdate,
} from '$lib/server/db/schema-type';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getInsurance = query(async (): Promise<InsuranceSchema[]> => {
	const data = await ensureDb().select().from(table.insuranceTable);
	return data;
});

// get count
export const getInsuranceCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.insuranceTable);
	return row?.count ?? 0;
});

// get paginated
export const getInsurancePaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<InsuranceSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.insuranceTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.insuranceTable),
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
export const getInsuranceById = query(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<InsuranceSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.insuranceTable)
			.where(eq(table.insuranceTable.id, id));
		return row ?? null;
	}
);

// create
export const createInsurance = command(
	'unchecked' as const,
	async (payload: InsuranceSchemaInsert): Promise<InsuranceSchema> => {
		const [row] = await ensureDb()
			.insert(table.insuranceTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getInsurance().refresh();
		return row;
	}
);

// update
export const updateInsurance = command(
	'unchecked' as const,
	async (
		payload: { id: string } & InsuranceSchemaUpdate,
	): Promise<InsuranceSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.insuranceTable)
			.set(rest as InsuranceSchemaUpdate)
			.where(eq(table.insuranceTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getInsurance().refresh();
		return row;
	}
);

// delete (hard)
export const deleteInsurance = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		await ensureDb()
			.delete(table.insuranceTable)
			.where(eq(table.insuranceTable.id, id));
		getInsurance().refresh();
	}
);

// delete complete (hard)
export const deleteInsuranceComplete = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		await ensureDb()
			.delete(table.insuranceTable)
			.where(eq(table.insuranceTable.id, id));
		getInsurance().refresh();
	}
);

