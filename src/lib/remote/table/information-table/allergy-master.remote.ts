import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	AllergyMasterSchema,
	AllergyMasterSchemaInsert,
	AllergyMasterSchemaUpdate
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getAllergyMaster = query(
	async (): Promise<AllergyMasterSchema[]> => {
		const data = await ensureDb()
			.select()
			.from(table.allergyMasterTable);
		return data;
	}
);

// get count
export const getAllergyMasterCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.allergyMasterTable);
		return row?.count ?? 0;
	}
);

// get paginated
export const getAllergyMasterPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<AllergyMasterSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.allergyMasterTable)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.allergyMasterTable)
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
	async ({
		allergyTypeId
	}: {
		allergyTypeId: number;
	}): Promise<AllergyMasterSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.allergyMasterTable)
			.where(
				eq(table.allergyMasterTable.allergyTypeId, allergyTypeId)
			);
		return row ?? null;
	}
);

// create
export const createAllergyMaster = command(
	'unchecked' as const,
	async (
		payload: AllergyMasterSchemaInsert
	): Promise<AllergyMasterSchema> => {
		const [row] = await ensureDb()
			.insert(table.allergyMasterTable)
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
		payload: { allergyTypeId: number } & AllergyMasterSchemaUpdate
	): Promise<AllergyMasterSchema> => {
		const { allergyTypeId, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.allergyMasterTable)
			.set(rest as AllergyMasterSchemaUpdate)
			.where(
				eq(table.allergyMasterTable.allergyTypeId, allergyTypeId)
			)
			.returning();
		if (!row) throw new Error('Update failed');
		getAllergyMaster().refresh();
		getAllergyMasterCount().refresh();
		getAllergyMasterPaginated(undefined).refresh();
		return row;
	}
);

// delete (hard)
export const deleteAllergyMaster = command(
	'unchecked' as const,
	async ({
		allergyTypeId
	}: {
		allergyTypeId: number;
	}): Promise<void> => {
		await ensureDb()
			.delete(table.allergyMasterTable)
			.where(
				eq(table.allergyMasterTable.allergyTypeId, allergyTypeId)
			);
		getAllergyMaster().refresh();
		getAllergyMasterCount().refresh();
		getAllergyMasterPaginated(undefined).refresh();
	}
);
