import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StaffShiftTypeSchema,
	StaffShiftTypeSchemaInsert,
	StaffShiftTypeSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

export const getStaffShiftType = query(
	async (): Promise<StaffShiftTypeSchema[]> => {
		return ensureDb()
			.select()
			.from(table.staffShiftTypeTable)
			.where(
				ne(table.staffShiftTypeTable.statusId, StatusEnum.DELETED)
			)
			.orderBy(table.staffShiftTypeTable.name);
	}
);

export const getStaffShiftTypeCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.staffShiftTypeTable)
			.where(
				ne(table.staffShiftTypeTable.statusId, StatusEnum.DELETED)
			);
		return row?.count ?? 0;
	}
);

export const getStaffShiftTypePaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<StaffShiftTypeSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.staffShiftTypeTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.staffShiftTypeTable)
				.where(notDeletedFilter)
				.orderBy(table.staffShiftTypeTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.staffShiftTypeTable)
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

export const getStaffShiftTypeById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<StaffShiftTypeSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.staffShiftTypeTable)
			.where(
				and(
					eq(table.staffShiftTypeTable.id, id),
					ne(table.staffShiftTypeTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

export const createStaffShiftType = command(
	'unchecked' as const,
	async (
		payload: StaffShiftTypeSchemaInsert
	): Promise<StaffShiftTypeSchema> => {
		const [row] = await ensureDb()
			.insert(table.staffShiftTypeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaffShiftType().refresh();
		return row;
	}
);

export const updateStaffShiftType = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		code?: string | null;
		statusId?: number | null;
	}): Promise<StaffShiftTypeSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.staffShiftTypeTable)
			.set(rest as StaffShiftTypeSchemaUpdate)
			.where(eq(table.staffShiftTypeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaffShiftType().refresh();
		return row;
	}
);

export const deleteStaffShiftType = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.staffShiftTypeTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.staffShiftTypeTable.id, id));
		getStaffShiftType().refresh();
	}
);

export const deleteStaffShiftTypeComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.staffShiftTypeTable)
			.where(eq(table.staffShiftTypeTable.id, id));
		getStaffShiftType().refresh();
	}
);
