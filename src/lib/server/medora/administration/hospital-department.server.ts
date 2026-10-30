import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	HospitalDepartmentSchema,
	HospitalDepartmentSchemaInsert
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, eq, ilike, ne } from 'drizzle-orm';

export async function getHospitalDepartmentPaginated(
	params: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<HospitalDepartmentSchema>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.hospitalDepartmentTable.hospitalId, params.hospitalId),
		ne(table.hospitalDepartmentTable.statusId, StatusEnum.DELETED)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(
			ilike(
				table.hospitalDepartmentTable.name,
				`%${nameFilter}%`
			)
		);
	}
	const codeFilter = params?.code?.trim();
	if (codeFilter) {
		conditions.push(
			ilike(
				table.hospitalDepartmentTable.code,
				`%${codeFilter}%`
			)
		);
	}
	if (typeof params?.statusId === 'number') {
		conditions.push(
			eq(table.hospitalDepartmentTable.statusId, params.statusId)
		);
	}
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.hospitalDepartmentTable)
			.where(whereClause)
			.orderBy(table.hospitalDepartmentTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.hospitalDepartmentTable)
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

export async function getHospitalDepartmentById(input: {
	hospitalId: string;
	id: number;
}): Promise<HospitalDepartmentSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.hospitalDepartmentTable)
		.where(
			and(
				eq(table.hospitalDepartmentTable.id, input.id),
				eq(
					table.hospitalDepartmentTable.hospitalId,
					input.hospitalId
				),
				ne(
					table.hospitalDepartmentTable.statusId,
					StatusEnum.DELETED
				)
			)
		);
	return row ?? null;
}

export async function createHospitalDepartment(
	payload: HospitalDepartmentSchemaInsert & { hospitalId: string }
): Promise<HospitalDepartmentSchema> {
	const [row] = await ensureDb()
		.insert(table.hospitalDepartmentTable)
		.values(payload)
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateHospitalDepartment(payload: {
	hospitalId: string;
	id: number;
	name?: string | null;
	code?: string | null;
	statusId?: number | null;
}): Promise<HospitalDepartmentSchema> {
	const { id, hospitalId, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.hospitalDepartmentTable)
		.set(rest)
		.where(
			and(
				eq(table.hospitalDepartmentTable.id, id),
				eq(table.hospitalDepartmentTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteHospitalDepartment(input: {
	hospitalId: string;
	id: number;
}): Promise<void> {
	await ensureDb()
		.update(table.hospitalDepartmentTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(
			and(
				eq(table.hospitalDepartmentTable.id, input.id),
				eq(
					table.hospitalDepartmentTable.hospitalId,
					input.hospitalId
				)
			)
		);
}

/** Staff assignment must reference a department row for this hospital. */
export async function assertHospitalDepartmentForStaff(input: {
	hospitalId: string;
	hospitalDepartmentId: number;
}): Promise<void> {
	const row = await getHospitalDepartmentById({
		hospitalId: input.hospitalId,
		id: input.hospitalDepartmentId
	});
	if (!row) {
		throw error(400, 'Department does not belong to this hospital.');
	}
}
