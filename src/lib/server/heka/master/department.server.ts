import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DepartmentSchema,
	DepartmentSchemaInsert,
	DepartmentSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, eq, ilike, ne } from 'drizzle-orm';

export async function getDepartmentPaginated(
	params?: PaginationParams
): Promise<PaginatedResult<DepartmentSchema>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const conditions = [ne(table.departmentTable.statusId, StatusEnum.DELETED)];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(ilike(table.departmentTable.name, `%${nameFilter}%`));
	}
	const codeFilter = params?.code?.trim();
	if (codeFilter) {
		conditions.push(ilike(table.departmentTable.code, `%${codeFilter}%`));
	}
	if (typeof params?.statusId === 'number') {
		conditions.push(eq(table.departmentTable.statusId, params.statusId));
	}
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.departmentTable)
			.where(whereClause)
			.orderBy(table.departmentTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.departmentTable)
			.where(whereClause)
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

export async function getDepartmentById(input: {
	id: number;
}): Promise<DepartmentSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.departmentTable)
		.where(
			and(
				eq(table.departmentTable.id, input.id),
				ne(table.departmentTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createDepartment(
	payload: DepartmentSchemaInsert
): Promise<DepartmentSchema> {
	const [row] = await ensureDb()
		.insert(table.departmentTable)
		.values(payload)
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateDepartment(payload: {
	id: number;
	name?: string | null;
	code?: string | null;
	statusId?: number | null;
}): Promise<DepartmentSchema> {
	const { id, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.departmentTable)
		.set(rest as DepartmentSchemaUpdate)
		.where(eq(table.departmentTable.id, id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteDepartment(input: { id: number }): Promise<void> {
	await ensureDb()
		.update(table.departmentTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.departmentTable.id, input.id));
}
