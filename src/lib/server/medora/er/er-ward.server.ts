import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ErWardSchema,
	ErWardSchemaInsert,
	ErWardSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { ErWardRow } from '$lib/model/type/medora/er/er.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, count, eq, ilike, ne } from 'drizzle-orm';

async function assertBranchInHospital(input: {
	hospitalId: string;
	branchId: string;
}): Promise<void> {
	const [branch] = await ensureDb()
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(
			and(
				eq(table.hospitalBranchTable.id, input.branchId),
				eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
				ne(table.hospitalBranchTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!branch) {
		throw error(400, 'Branch not found for this hospital');
	}
}

async function assertCategoryInHospital(input: {
	hospitalId: string;
	erWardCategoryId: number;
}): Promise<void> {
	const [cat] = await ensureDb()
		.select({ id: table.erWardCategoryTable.id })
		.from(table.erWardCategoryTable)
		.where(
			and(
				eq(table.erWardCategoryTable.id, input.erWardCategoryId),
				eq(table.erWardCategoryTable.hospitalId, input.hospitalId),
				ne(table.erWardCategoryTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!cat) {
		throw error(400, 'Ward category not found for this hospital');
	}
}

export async function getErWardPaginated(
	params: PaginationParams & {
		hospitalId: string;
		branchId?: string;
		erWardCategoryId?: number;
	}
): Promise<PaginatedResult<ErWardRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.erWardTable.hospitalId, params.hospitalId),
		ne(table.erWardTable.statusId, StatusEnum.DELETED)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(ilike(table.erWardTable.name, `%${nameFilter}%`));
	}
	const codeFilter = params?.code?.trim();
	if (codeFilter) {
		conditions.push(ilike(table.erWardTable.code, `%${codeFilter}%`));
	}
	if (typeof params?.statusId === 'number') {
		conditions.push(eq(table.erWardTable.statusId, params.statusId));
	}
	if (params.branchId) {
		conditions.push(eq(table.erWardTable.branchId, params.branchId));
	}
	if (typeof params.erWardCategoryId === 'number') {
		conditions.push(
			eq(table.erWardTable.erWardCategoryId, params.erWardCategoryId)
		);
	}
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.erWardTable.id,
				hospitalId: table.erWardTable.hospitalId,
				branchId: table.erWardTable.branchId,
				erWardCategoryId: table.erWardTable.erWardCategoryId,
				name: table.erWardTable.name,
				code: table.erWardTable.code,
				statusId: table.erWardTable.statusId,
				branchName: table.hospitalBranchTable.name,
				wardCategoryName: table.erWardCategoryTable.name,
				wardMarkup: table.erWardCategoryTable.wardMarkup
			})
			.from(table.erWardTable)
			.leftJoin(
				table.hospitalBranchTable,
				eq(
					table.erWardTable.branchId,
					table.hospitalBranchTable.id
				)
			)
			.leftJoin(
				table.erWardCategoryTable,
				eq(
					table.erWardTable.erWardCategoryId,
					table.erWardCategoryTable.id
				)
			)
			.where(whereClause)
			.orderBy(table.erWardTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.erWardTable)
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

export async function listActiveErWards(input: {
	hospitalId: string;
	branchId?: string | null;
}): Promise<ErWardSchema[]> {
	const conditions = [
		eq(table.erWardTable.hospitalId, input.hospitalId),
		eq(table.erWardTable.statusId, StatusEnum.ACTIVE)
	];
	if (input.branchId) {
		conditions.push(eq(table.erWardTable.branchId, input.branchId));
	}
	return ensureDb()
		.select()
		.from(table.erWardTable)
		.where(and(...conditions))
		.orderBy(table.erWardTable.name);
}

export async function getErWardById(input: {
	id: number;
}): Promise<ErWardSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.erWardTable)
		.where(
			and(
				eq(table.erWardTable.id, input.id),
				ne(table.erWardTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createErWard(
	payload: ErWardSchemaInsert
): Promise<ErWardSchema> {
	const branchId = payload.branchId;
	if (!branchId || String(branchId).trim() === '') {
		throw error(400, 'Branch is required');
	}
	await assertBranchInHospital({
		hospitalId: payload.hospitalId,
		branchId: String(branchId)
	});
	await assertCategoryInHospital({
		hospitalId: payload.hospitalId,
		erWardCategoryId: payload.erWardCategoryId
	});
	const [row] = await ensureDb()
		.insert(table.erWardTable)
		.values({
			...payload,
			branchId: String(branchId)
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateErWard(payload: {
	id: number;
	hospitalId: string;
	name?: string | null;
	code?: string | null;
	branchId?: string | null;
	erWardCategoryId?: number | null;
	statusId?: number | null;
}): Promise<ErWardSchema> {
	const { id, hospitalId, ...rest } = payload;
	if (rest.branchId != null && String(rest.branchId).trim() !== '') {
		await assertBranchInHospital({
			hospitalId,
			branchId: String(rest.branchId)
		});
	} else if (rest.branchId !== undefined) {
		throw error(400, 'Branch is required');
	}
	if (typeof rest.erWardCategoryId === 'number') {
		await assertCategoryInHospital({
			hospitalId,
			erWardCategoryId: rest.erWardCategoryId
		});
	}
	const [row] = await ensureDb()
		.update(table.erWardTable)
		.set(rest as ErWardSchemaUpdate)
		.where(
			and(
				eq(table.erWardTable.id, id),
				eq(table.erWardTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteErWard(input: {
	id: number;
	hospitalId: string;
}): Promise<void> {
	await ensureDb()
		.update(table.erWardTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.erWardTable.id, input.id),
				eq(table.erWardTable.hospitalId, input.hospitalId)
			)
		);
}
