import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, eq, ilike, inArray, isNull, ne, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StatusSchema,
	StoreSchema,
	UserGroupSchema
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';

export type StoreUserGroupRef = { id: number; name: string | null };
export type StoreWithUserGroups = StoreSchema & {
	userGroups: StoreUserGroupRef[];
};

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

/** Validates that every userGroupId belongs to `hospitalId`. Empty array is OK. */
async function ensureUserGroupsBelongToHospital(
	hospitalId: string,
	userGroupIds: number[]
): Promise<void> {
	if (userGroupIds.length === 0) return;
	const rows = await ensureDb()
		.select({ id: table.userGroupTable.id })
		.from(table.userGroupTable)
		.where(
			and(
				inArray(table.userGroupTable.id, userGroupIds),
				eq(table.userGroupTable.hospitalId, hospitalId),
				ne(table.userGroupTable.statusId, StatusEnum.DELETED)
			)
		);
	if (rows.length !== userGroupIds.length) {
		throw error(400, 'Invalid user group(s) for this hospital');
	}
}

function uniqueValidUserGroupIds(input: readonly number[] | null | undefined): number[] {
	if (!input) return [];
	const out = new Set<number>();
	for (const v of input) {
		if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
			out.add(v);
		}
	}
	return [...out];
}

async function fetchUserGroupsForStores(
	storeIds: number[]
): Promise<Map<number, StoreUserGroupRef[]>> {
	const result = new Map<number, StoreUserGroupRef[]>();
	if (storeIds.length === 0) return result;
	const rows = await ensureDb()
		.select({
			storeId: table.storeUserGroupTable.storeId,
			userGroupId: table.storeUserGroupTable.userGroupId,
			userGroupName: table.userGroupTable.name
		})
		.from(table.storeUserGroupTable)
		.innerJoin(
			table.userGroupTable,
			eq(table.userGroupTable.id, table.storeUserGroupTable.userGroupId)
		)
		.where(inArray(table.storeUserGroupTable.storeId, storeIds))
		.orderBy(table.userGroupTable.name);
	for (const r of rows) {
		const arr = result.get(r.storeId) ?? [];
		arr.push({ id: r.userGroupId, name: r.userGroupName });
		result.set(r.storeId, arr);
	}
	return result;
}

export async function getStoresPaginated(
	event: RequestEvent,
	input: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<StoreWithUserGroups>> {
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

	const groupsByStore = await fetchUserGroupsForStores(
		data.map((s) => s.id)
	);
	const dataWithGroups: StoreWithUserGroups[] = data.map((s) => ({
		...s,
		userGroups: groupsByStore.get(s.id) ?? []
	}));

	const total = countResult[0]?.count ?? 0;
	return {
		data: dataWithGroups,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function getStoreById(
	event: RequestEvent,
	input: { hospitalId: string; id: number }
): Promise<StoreWithUserGroups | null> {
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
	if (!row) return null;

	const groupsByStore = await fetchUserGroupsForStores([row.id]);
	return {
		...row,
		userGroups: groupsByStore.get(row.id) ?? []
	};
}

export type CreateStoreInput = {
	hospitalId: string;
	branchId: string;
	storeName: string | null;
	remark: string | null;
	isPurchaseRequisitable: boolean;
	statusId?: number;
	userGroupIds?: number[];
};

export async function createStore(
	event: RequestEvent,
	input: CreateStoreInput
): Promise<StoreWithUserGroups> {
	await ensureCanAccessHospital(event, input.hospitalId);
	await ensureBranchBelongsToHospital(input.hospitalId, input.branchId);

	const userGroupIds = uniqueValidUserGroupIds(input.userGroupIds);
	await ensureUserGroupsBelongToHospital(input.hospitalId, userGroupIds);

	const userId = event.locals.user?.id ?? null;

	const created = await ensureDb().transaction(async (tx) => {
		const [row] = await tx
			.insert(table.storeTable)
			.values({
				branchId: input.branchId,
				storeName: input.storeName,
				remark: input.remark,
				isPurchaseRequisitable: input.isPurchaseRequisitable,
				statusId: input.statusId ?? StatusEnum.ACTIVE
			})
			.returning();
		if (!row) throw new Error('Insert failed');

		if (userGroupIds.length > 0) {
			await tx.insert(table.storeUserGroupTable).values(
				userGroupIds.map((ugId) => ({
					storeId: row.id,
					userGroupId: ugId,
					createdBy: userId,
					updatedBy: userId
				}))
			);
		}

		return row;
	});

	const groupsByStore = await fetchUserGroupsForStores([created.id]);
	return {
		...created,
		userGroups: groupsByStore.get(created.id) ?? []
	};
}

export type UpdateStoreInput = {
	hospitalId: string;
	id: number;
	branchId?: string;
	storeName?: string | null;
	remark?: string | null;
	isPurchaseRequisitable?: boolean;
	statusId?: number;
	/** Pass an array (possibly empty) to replace links; undefined leaves links unchanged. */
	userGroupIds?: number[];
};

export async function updateStore(
	event: RequestEvent,
	input: UpdateStoreInput
): Promise<StoreWithUserGroups> {
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

	const replaceUserGroups = input.userGroupIds !== undefined;
	const userGroupIds = replaceUserGroups
		? uniqueValidUserGroupIds(input.userGroupIds)
		: [];
	if (replaceUserGroups) {
		await ensureUserGroupsBelongToHospital(
			input.hospitalId,
			userGroupIds
		);
	}

	const setObj: Partial<typeof table.storeTable.$inferInsert> = {};
	if (input.branchId !== undefined) setObj.branchId = input.branchId;
	if (input.storeName !== undefined) setObj.storeName = input.storeName;
	if (input.remark !== undefined) setObj.remark = input.remark;
	if (input.isPurchaseRequisitable !== undefined) {
		setObj.isPurchaseRequisitable = input.isPurchaseRequisitable;
	}
	if (input.statusId !== undefined) setObj.statusId = input.statusId;

	const userId = event.locals.user?.id ?? null;

	await ensureDb().transaction(async (tx) => {
		if (Object.keys(setObj).length > 0) {
			await tx
				.update(table.storeTable)
				.set(setObj)
				.where(eq(table.storeTable.id, input.id));
		}

		if (replaceUserGroups) {
			await tx
				.delete(table.storeUserGroupTable)
				.where(eq(table.storeUserGroupTable.storeId, input.id));
			if (userGroupIds.length > 0) {
				await tx.insert(table.storeUserGroupTable).values(
					userGroupIds.map((ugId) => ({
						storeId: input.id,
						userGroupId: ugId,
						createdBy: userId,
						updatedBy: userId
					}))
				);
			}
		}
	});

	const [row] = await ensureDb()
		.select()
		.from(table.storeTable)
		.where(eq(table.storeTable.id, input.id))
		.limit(1);
	if (!row) throw new Error('Update failed');

	const groupsByStore = await fetchUserGroupsForStores([row.id]);
	return {
		...row,
		userGroups: groupsByStore.get(row.id) ?? []
	};
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
	statuses: StatusSchema[];
}> {
	await ensureCanAccessHospital(event, input.hospitalId);

	const [userGroups, statuses] = await Promise.all([
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
			.from(table.statusTable)
			.where(isNull(table.statusTable.deletedAt))
			.orderBy(table.statusTable.name)
	]);

	return { userGroups, statuses };
}
