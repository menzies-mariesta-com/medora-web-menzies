import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, eq, ilike, inArray, isNull, ne, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DepartmentSchema,
	StatusSchema,
	StoreSchema,
	StoreSchemaInsert,
	StoreSchemaUpdate,
	UserGroupSchema
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';

function assertStoreOwnerXor(payload: {
	userGroupId?: number | null;
	departmentId?: number | null;
}): void {
	const ug = payload.userGroupId ?? null;
	const dep = payload.departmentId ?? null;
	const hasUg = ug != null;
	const hasDep = dep != null;
	if (hasUg === hasDep) {
		throw error(
			400,
			'Store must be linked to exactly one of user group or department.'
		);
	}
}

async function branchIdsForHospital(
	hospitalId: string
): Promise<string[]> {
	const rows = await ensureDb()
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(eq(table.hospitalBranchTable.hospitalId, hospitalId));
	return rows.map((r) => r.id);
}

async function ensureBranchBelongsToHospital(
	hospitalId: string,
	branchId: string
): Promise<void> {
	const [row] = await ensureDb()
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(
			and(
				eq(table.hospitalBranchTable.id, branchId),
				eq(table.hospitalBranchTable.hospitalId, hospitalId)
			)
		)
		.limit(1);
	if (!row) throw error(400, 'Invalid branch for this hospital');
}

export async function getStoresPaginated(
	event: RequestEvent,
	input: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<StoreSchema>> {
	await ensureCanAccessHospital(event, input.hospitalId);
	const { page, pageSize, limit, offset } = normalizePagination(input);

	const notDeleted = ne(table.storeTable.statusId, StatusEnum.DELETED);
	let whereExpr: SQL = notDeleted;

	const ids = await branchIdsForHospital(input.hospitalId);
	if (ids.length === 0) {
		return { data: [], total: 0, page, pageSize, totalPages: 1 };
	}
	whereExpr = and(whereExpr, inArray(table.storeTable.branchId, ids))!;

	const nameFilter = input.name?.trim();
	if (nameFilter) {
		whereExpr = and(
			whereExpr,
			ilike(table.storeTable.storeName, `%${nameFilter}%`)
		)!;
	}

	if (typeof input.statusId === 'number') {
		whereExpr = and(
			whereExpr,
			eq(table.storeTable.statusId, input.statusId)
		)!;
	}

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.storeTable)
			.where(whereExpr)
			.orderBy(table.storeTable.storeName)
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.storeTable)
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

export async function getStoreById(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<StoreSchema | null> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const ids = await branchIdsForHospital(input.hospitalId);
	if (ids.length === 0) return null;

	const [row] = await ensureDb()
		.select()
		.from(table.storeTable)
		.where(
			and(
				eq(table.storeTable.id, input.id),
				ne(table.storeTable.statusId, StatusEnum.DELETED),
				inArray(table.storeTable.branchId, ids)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function createStore(
	event: RequestEvent,
	input: { hospitalId: string } & StoreSchemaInsert
): Promise<StoreSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);
	await ensureBranchBelongsToHospital(input.hospitalId, input.branchId);
	assertStoreOwnerXor({
		userGroupId: input.userGroupId,
		departmentId: input.departmentId
	});

	const { hospitalId: _hid, ...payload } = input;
	const [row] = await ensureDb()
		.insert(table.storeTable)
		.values(payload)
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateStore(
	event: RequestEvent,
	input: { hospitalId: string; id: number } & StoreSchemaUpdate
): Promise<StoreSchema> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const ids = await branchIdsForHospital(input.hospitalId);
	if (ids.length === 0) throw error(404, 'Store not found');

	const [existing] = await ensureDb()
		.select()
		.from(table.storeTable)
		.where(
			and(
				eq(table.storeTable.id, input.id),
				inArray(table.storeTable.branchId, ids)
			)
		)
		.limit(1);
	if (!existing) throw error(404, 'Store not found');

	const nextBranchId =
		input.branchId !== undefined ? input.branchId : existing.branchId;
	await ensureBranchBelongsToHospital(input.hospitalId, nextBranchId);

	const nextUg =
		input.userGroupId !== undefined
			? input.userGroupId
			: existing.userGroupId;
	const nextDep =
		input.departmentId !== undefined
			? input.departmentId
			: existing.departmentId;
	assertStoreOwnerXor({ userGroupId: nextUg, departmentId: nextDep });

	const setObj: StoreSchemaUpdate = { ...input };
	delete (setObj as any).hospitalId;
	delete (setObj as any).id;

	if (input.userGroupId !== undefined && input.userGroupId != null) {
		setObj.departmentId = null;
	}
	if (input.departmentId !== undefined && input.departmentId != null) {
		setObj.userGroupId = null;
	}

	const [row] = await ensureDb()
		.update(table.storeTable)
		.set(setObj)
		.where(eq(table.storeTable.id, input.id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteStore(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<void> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const ids = await branchIdsForHospital(input.hospitalId);
	if (ids.length === 0) throw error(404, 'Store not found');

	const [row] = await ensureDb()
		.select({ id: table.storeTable.id })
		.from(table.storeTable)
		.where(
			and(
				eq(table.storeTable.id, input.id),
				inArray(table.storeTable.branchId, ids)
			)
		)
		.limit(1);
	if (!row) throw error(404, 'Store not found');

	await ensureDb()
		.update(table.storeTable)
		.set({
			statusId: StatusEnum.DELETED,
			deletedAt: sql`now()`,
			deletedBy: event.locals.user?.id ?? null
		})
		.where(eq(table.storeTable.id, input.id));
}

export async function getStoreLookups(
	event: RequestEvent,
	input: { hospitalId: string }
): Promise<{
	userGroups: UserGroupSchema[];
	departments: DepartmentSchema[];
	statuses: StatusSchema[];
}> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const [userGroups, departments, statuses] = await Promise.all([
		ensureDb()
			.select()
			.from(table.userGroupTable)
			.where(
				and(
					eq(table.userGroupTable.hospitalId, input.hospitalId),
					ne(table.userGroupTable.statusId, StatusEnum.DELETED)
				)
			)
			.orderBy(table.userGroupTable.name),
		ensureDb()
			.select()
			.from(table.departmentTable)
			.where(ne(table.departmentTable.statusId, StatusEnum.DELETED))
			.orderBy(table.departmentTable.name),
		ensureDb()
			.select()
			.from(table.statusTable)
			.where(isNull(table.statusTable.deletedAt))
			.orderBy(table.statusTable.name)
	]);

	return { userGroups, departments, statuses };
}

