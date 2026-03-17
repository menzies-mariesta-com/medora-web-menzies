import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	AllergySchema,
	AllergySchemaInsert,
	AllergySchemaUpdate
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { and, count, eq, ne } from 'drizzle-orm';

// get all
export const getAllergyMaster = query(
	async (): Promise<AllergySchema[]> => {
		const whereExpr = ne(table.allergyTable.statusId, StatusEnum.DELETED);
		const data = await ensureDb()
			.select()
			.from(table.allergyTable)
			.where(whereExpr);
		return data;
	}
);

// get count
export const getAllergyMasterCount = query(
	async (): Promise<number> => {
		const whereExpr = ne(table.allergyTable.statusId, StatusEnum.DELETED);
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.allergyTable)
			.where(whereExpr);
		return row?.count ?? 0;
	}
);

// get paginated
export const getAllergyMasterPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<AllergySchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const whereExpr = ne(table.allergyTable.statusId, StatusEnum.DELETED);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.allergyTable)
				.where(whereExpr)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.allergyTable)
				.where(whereExpr)
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
export const getAllergyMasterById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<AllergySchema | null> => {
		const whereExpr = and(
			eq(table.allergyTable.id, id),
			ne(table.allergyTable.statusId, StatusEnum.DELETED)
		);
		const [row] = await ensureDb()
			.select()
			.from(table.allergyTable)
			.where(whereExpr);
		return row ?? null;
	}
);

// create
export const createAllergyMaster = command(
	'unchecked' as const,
	async (
		payload: AllergySchemaInsert
	): Promise<AllergySchema> => {
		const [row] = await ensureDb()
			.insert(table.allergyTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getAllergyMaster().refresh();
		getAllergyMasterCount().refresh();
		getAllergyMasterPaginated(undefined).refresh();
		return row;
	}
);

// update
export const updateAllergyMaster = command(
	'unchecked' as const,
	async (
		payload: { id: number } & AllergySchemaUpdate
	): Promise<AllergySchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.allergyTable)
			.set(rest as AllergySchemaUpdate)
			.where(eq(table.allergyTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getAllergyMaster().refresh();
		getAllergyMasterCount().refresh();
		getAllergyMasterPaginated(undefined).refresh();
		return row;
	}
);

// delete (soft)
export const deleteAllergyMaster = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.allergyTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.allergyTable.id, id));
		getAllergyMaster().refresh();
		getAllergyMasterCount().refresh();
		getAllergyMasterPaginated(undefined).refresh();
	}
);
