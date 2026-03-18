import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DepartmentSchema,
	DepartmentSchemaInsert,
	DepartmentSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

export const getDepartment = query(
	async (): Promise<DepartmentSchema[]> => {
		return ensureDb()
			.select()
			.from(table.departmentTable)
			.where(ne(table.departmentTable.statusId, StatusEnum.DELETED))
			.orderBy(table.departmentTable.name);
	}
);

export const getDepartmentCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.departmentTable)
		.where(ne(table.departmentTable.statusId, StatusEnum.DELETED));
	return row?.count ?? 0;
});

export const getDepartmentPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<DepartmentSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.departmentTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.departmentTable)
				.where(notDeletedFilter)
				.orderBy(table.departmentTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.departmentTable)
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

export const getDepartmentById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<DepartmentSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.departmentTable)
			.where(
				and(
					eq(table.departmentTable.id, id),
					ne(table.departmentTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

export const createDepartment = command(
	'unchecked' as const,
	async (
		payload: DepartmentSchemaInsert
	): Promise<DepartmentSchema> => {
		const [row] = await ensureDb()
			.insert(table.departmentTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getDepartment().refresh();
		return row;
	}
);

export const updateDepartment = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		code?: string | null;
		statusId?: number | null;
	}): Promise<DepartmentSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.departmentTable)
			.set(rest as DepartmentSchemaUpdate)
			.where(eq(table.departmentTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getDepartment().refresh();
		return row;
	}
);

export const deleteDepartment = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.departmentTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.departmentTable.id, id));
		getDepartment().refresh();
	}
);

export const deleteDepartmentComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.departmentTable)
			.where(eq(table.departmentTable.id, id));
		getDepartment().refresh();
	}
);
