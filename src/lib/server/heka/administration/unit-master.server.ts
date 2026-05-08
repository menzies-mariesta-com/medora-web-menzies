import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	UnitSchema,
	UnitSchemaInsert,
	UnitSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { UnitMasterListRow } from '$lib/model/type/heka/ui-rows.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { and, asc, count, desc, eq, ilike, isNull, ne, sql } from 'drizzle-orm';

export async function listUnitTypesForUnitMaster() {
	return ensureDb()
		.select()
		.from(table.unitTypeTable)
		.where(ne(table.unitTypeTable.statusId, StatusEnum.DELETED))
		.orderBy(asc(table.unitTypeTable.name));
}

export async function getUnitsPaginated(
	params?: PaginationParams & {
		search?: string;
		unitTypeId?: number;
		statusId?: number;
	}
): Promise<PaginatedResult<UnitMasterListRow>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const notDeleted = ne(table.unitTable.statusId, StatusEnum.DELETED);
	const parts = [notDeleted];
	const search = params?.search?.trim();
	if (search && search.length > 0) {
		parts.push(ilike(table.unitTable.name, `%${search}%`));
	}
	const ut = params?.unitTypeId;
	if (ut != null && Number.isFinite(ut)) {
		parts.push(eq(table.unitTable.unitTypeId, ut));
	}
	if (typeof params?.statusId === 'number') {
		parts.push(eq(table.unitTable.statusId, params.statusId));
	}
	const whereClause = and(...parts);

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select({
				id: table.unitTable.id,
				name: table.unitTable.name,
				unitTypeId: table.unitTable.unitTypeId,
				statusId: table.unitTable.statusId,
				createdAt: table.unitTable.createdAt,
				updatedAt: table.unitTable.updatedAt,
				deletedAt: table.unitTable.deletedAt,
				createdBy: table.unitTable.createdBy,
				updatedBy: table.unitTable.updatedBy,
				deletedBy: table.unitTable.deletedBy,
				unitTypeName: table.unitTypeTable.name
			})
			.from(table.unitTable)
			.leftJoin(
				table.unitTypeTable,
				eq(table.unitTable.unitTypeId, table.unitTypeTable.id)
			)
			.where(whereClause)
			.orderBy(desc(table.unitTable.id))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.unitTable)
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

export async function getUnitByIdForMaster(input: {
	id: number;
}): Promise<UnitMasterListRow | null> {
	const [row] = await ensureDb()
		.select({
			id: table.unitTable.id,
			name: table.unitTable.name,
			unitTypeId: table.unitTable.unitTypeId,
			statusId: table.unitTable.statusId,
			createdAt: table.unitTable.createdAt,
			updatedAt: table.unitTable.updatedAt,
			deletedAt: table.unitTable.deletedAt,
			createdBy: table.unitTable.createdBy,
			updatedBy: table.unitTable.updatedBy,
			deletedBy: table.unitTable.deletedBy,
			unitTypeName: table.unitTypeTable.name
		})
		.from(table.unitTable)
		.leftJoin(
			table.unitTypeTable,
			eq(table.unitTable.unitTypeId, table.unitTypeTable.id)
		)
		.where(
			and(
				eq(table.unitTable.id, input.id),
				ne(table.unitTable.statusId, StatusEnum.DELETED)
			)
		);
	return row ?? null;
}

async function assertUniqueUnitName(input: {
	name: string;
	excludeId?: number;
}): Promise<void> {
	const normalized = input.name.trim().toLowerCase();
	const [dup] = await ensureDb()
		.select({ id: table.unitTable.id })
		.from(table.unitTable)
		.where(
			and(
				ne(table.unitTable.statusId, StatusEnum.DELETED),
				sql`lower(trim(${table.unitTable.name})) = ${normalized}`
			)
		)
		.limit(1);
	if (dup && dup.id !== input.excludeId) {
		throw new Error('A unit with this name already exists.');
	}
}

export async function createUnit(
	payload: Pick<UnitSchemaInsert, 'name' | 'unitTypeId' | 'statusId'>
): Promise<UnitSchema> {
	const name = payload.name?.trim();
	if (!name) throw new Error('Name is required.');
	await assertUniqueUnitName({ name });
	const [row] = await ensureDb()
		.insert(table.unitTable)
		.values({
			name,
			unitTypeId: payload.unitTypeId ?? null,
			statusId: payload.statusId ?? StatusEnum.ACTIVE
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateUnit(
	payload: UnitSchemaUpdate & { id: number }
): Promise<UnitSchema> {
	const { id, ...rest } = payload;
	const existing = await ensureDb()
		.select()
		.from(table.unitTable)
		.where(
			and(
				eq(table.unitTable.id, id),
				ne(table.unitTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!existing[0]) throw new Error('Unit not found.');

	let setPayload = { ...rest } as UnitSchemaUpdate;
	if (rest.name !== undefined) {
		const t = rest.name?.trim();
		if (!t) throw new Error('Name is required.');
		await assertUniqueUnitName({ name: t, excludeId: id });
		setPayload = { ...setPayload, name: t };
	}

	const [row] = await ensureDb()
		.update(table.unitTable)
		.set(setPayload)
		.where(eq(table.unitTable.id, id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteUnit(input: { id: number }): Promise<void> {
	const existing = await ensureDb()
		.select()
		.from(table.unitTable)
		.where(
			and(
				eq(table.unitTable.id, input.id),
				ne(table.unitTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!existing[0]) throw new Error('Unit not found.');

	const [refPurchase] = await ensureDb()
		.select({ id: table.itemUnitMasterTable.id })
		.from(table.itemUnitMasterTable)
		.where(
			and(
				eq(table.itemUnitMasterTable.purchaseUnitId, input.id),
				ne(table.itemUnitMasterTable.statusId, StatusEnum.DELETED),
				isNull(table.itemUnitMasterTable.deletedAt)
			)
		)
		.limit(1);
	const [refIssue] = await ensureDb()
		.select({ id: table.itemUnitMasterTable.id })
		.from(table.itemUnitMasterTable)
		.where(
			and(
				eq(table.itemUnitMasterTable.issueUnitId, input.id),
				ne(table.itemUnitMasterTable.statusId, StatusEnum.DELETED),
				isNull(table.itemUnitMasterTable.deletedAt)
			)
		)
		.limit(1);
	if (refPurchase || refIssue) {
		throw new Error(
			'This unit is used in item unit conversion profiles. Remove or edit those first.'
		);
	}

	await ensureDb()
		.update(table.unitTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.unitTable.id, input.id));
}
