import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	WardSchema,
	WardSchemaInsert,
	WardSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { WardRow } from '$lib/model/type/medora/ipd/ipd.type';
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
	wardCategoryId: number;
}): Promise<void> {
	const [cat] = await ensureDb()
		.select({ id: table.wardCategoryTable.id })
		.from(table.wardCategoryTable)
		.where(
			and(
				eq(table.wardCategoryTable.id, input.wardCategoryId),
				eq(table.wardCategoryTable.hospitalId, input.hospitalId),
				ne(table.wardCategoryTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!cat) {
		throw error(400, 'Ward category not found for this hospital');
	}
}

export async function getWardPaginated(
	params: PaginationParams & {
		hospitalId: string;
		branchId?: string;
		wardCategoryId?: number;
	}
): Promise<PaginatedResult<WardRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.wardTable.hospitalId, params.hospitalId),
		ne(table.wardTable.statusId, StatusEnum.DELETED)
	];
	const nameFilter = params?.name?.trim();
	if (nameFilter) {
		conditions.push(ilike(table.wardTable.name, `%${nameFilter}%`));
	}
	const codeFilter = params?.code?.trim();
	if (codeFilter) {
		conditions.push(ilike(table.wardTable.code, `%${codeFilter}%`));
	}
	if (typeof params?.statusId === 'number') {
		conditions.push(eq(table.wardTable.statusId, params.statusId));
	}
	if (params.branchId) {
		conditions.push(eq(table.wardTable.branchId, params.branchId));
	}
	if (typeof params.wardCategoryId === 'number') {
		conditions.push(
			eq(table.wardTable.wardCategoryId, params.wardCategoryId)
		);
	}
	const whereClause = and(...conditions);
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.wardTable.id,
				hospitalId: table.wardTable.hospitalId,
				branchId: table.wardTable.branchId,
				wardCategoryId: table.wardTable.wardCategoryId,
				name: table.wardTable.name,
				code: table.wardTable.code,
				statusId: table.wardTable.statusId,
				branchName: table.hospitalBranchTable.name,
				wardCategoryName: table.wardCategoryTable.name,
				wardMarkup: table.wardCategoryTable.wardMarkup
			})
			.from(table.wardTable)
			.leftJoin(
				table.hospitalBranchTable,
				eq(
					table.wardTable.branchId,
					table.hospitalBranchTable.id
				)
			)
			.leftJoin(
				table.wardCategoryTable,
				eq(
					table.wardTable.wardCategoryId,
					table.wardCategoryTable.id
				)
			)
			.where(whereClause)
			.orderBy(table.wardTable.name)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.wardTable)
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

export async function listActiveWards(input: {
	hospitalId: string;
	branchId?: string | null;
}): Promise<WardSchema[]> {
	const conditions = [
		eq(table.wardTable.hospitalId, input.hospitalId),
		eq(table.wardTable.statusId, StatusEnum.ACTIVE)
	];
	if (input.branchId) {
		conditions.push(eq(table.wardTable.branchId, input.branchId));
	}
	return ensureDb()
		.select()
		.from(table.wardTable)
		.where(and(...conditions))
		.orderBy(table.wardTable.name);
}

export async function getWardById(input: {
	id: number;
}): Promise<WardSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.wardTable)
		.where(
			and(
				eq(table.wardTable.id, input.id),
				ne(table.wardTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

export async function createWard(
	payload: WardSchemaInsert
): Promise<WardSchema> {
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
		wardCategoryId: payload.wardCategoryId
	});
	const [row] = await ensureDb()
		.insert(table.wardTable)
		.values({
			...payload,
			branchId: String(branchId)
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateWard(payload: {
	id: number;
	hospitalId: string;
	name?: string | null;
	code?: string | null;
	branchId?: string | null;
	wardCategoryId?: number | null;
	statusId?: number | null;
}): Promise<WardSchema> {
	const { id, hospitalId, ...rest } = payload;
	if (rest.branchId != null && String(rest.branchId).trim() !== '') {
		await assertBranchInHospital({
			hospitalId,
			branchId: String(rest.branchId)
		});
	} else if (rest.branchId !== undefined) {
		throw error(400, 'Branch is required');
	}
	if (typeof rest.wardCategoryId === 'number') {
		await assertCategoryInHospital({
			hospitalId,
			wardCategoryId: rest.wardCategoryId
		});
	}
	const [row] = await ensureDb()
		.update(table.wardTable)
		.set(rest as WardSchemaUpdate)
		.where(
			and(
				eq(table.wardTable.id, id),
				eq(table.wardTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteWard(input: {
	id: number;
	hospitalId: string;
}): Promise<void> {
	await ensureDb()
		.update(table.wardTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.wardTable.id, input.id),
				eq(table.wardTable.hospitalId, input.hospitalId)
			)
		);
}
