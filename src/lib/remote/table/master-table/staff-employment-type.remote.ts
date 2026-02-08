import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StaffEmploymentTypeSchema,
	StaffEmploymentTypeSchemaInsert,
	StaffEmploymentTypeSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getStaffEmploymentType = query(async (): Promise<StaffEmploymentTypeSchema[]> => {
	const data = await ensureDb().select().from(table.staffEmploymentTypeTable);
	return data;
});

// get count
export const getStaffEmploymentTypeCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.staffEmploymentTypeTable);
	return row?.count ?? 0;
});

// get paginated
export const getStaffEmploymentTypePaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<StaffEmploymentTypeSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.staffEmploymentTypeTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.staffEmploymentTypeTable),
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
export const getStaffEmploymentTypeById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StaffEmploymentTypeSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.staffEmploymentTypeTable)
			.where(eq(table.staffEmploymentTypeTable.id, id));
		return row ?? null;
	}
);

// create
export const createStaffEmploymentType = command(
	'unchecked' as const,
	async (payload: StaffEmploymentTypeSchemaInsert): Promise<StaffEmploymentTypeSchema> => {
		const [row] = await ensureDb()
			.insert(table.staffEmploymentTypeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaffEmploymentType().refresh();
		return row;
	}
);

// update
export const updateStaffEmploymentType = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		code?: string | null;
		statusId?: number | null;
	}): Promise<StaffEmploymentTypeSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.staffEmploymentTypeTable)
			.set(rest as StaffEmploymentTypeSchemaUpdate)
			.where(eq(table.staffEmploymentTypeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaffEmploymentType().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteStaffEmploymentType = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.staffEmploymentTypeTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.staffEmploymentTypeTable.id, id));
		getStaffEmploymentType().refresh();
	}
);

// delete complete (hard)
export const deleteStaffEmploymentTypeComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.staffEmploymentTypeTable).where(eq(table.staffEmploymentTypeTable.id, id));
		getStaffEmploymentType().refresh();
	}
);
