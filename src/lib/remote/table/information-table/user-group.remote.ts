import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	UserGroupSchema,
	UserGroupSchemaInsert,
	UserGroupSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, eq, ne } from 'drizzle-orm';

// get all (optional hospitalId to scope to one hospital)
export const getUserGroup = query(
	'unchecked' as const,
	async (params?: {
		hospitalId?: string | null;
	}): Promise<UserGroupSchema[]> => {
		if (params?.hospitalId != null && params.hospitalId !== '') {
			return ensureDb()
				.select()
				.from(table.userGroupTable)
				.where(
					and(
						eq(table.userGroupTable.hospitalId, params.hospitalId),
						ne(table.userGroupTable.statusId, StatusEnum.DELETED)
					)
				)
				.orderBy(table.userGroupTable.name);
		}
		return ensureDb()
			.select()
			.from(table.userGroupTable)
			.where(ne(table.userGroupTable.statusId, StatusEnum.DELETED))
			.orderBy(table.userGroupTable.name);
	}
);

/** Get user groups for a hospital (for dropdowns and admin list). Excludes soft-deleted. */
export const getUserGroupByHospitalId = query(
	'unchecked' as const,
	async ({
		hospitalId
	}: {
		hospitalId: string;
	}): Promise<UserGroupSchema[]> => {
		return ensureDb()
			.select()
			.from(table.userGroupTable)
			.where(
				and(
					eq(table.userGroupTable.hospitalId, hospitalId),
					ne(table.userGroupTable.statusId, StatusEnum.DELETED)
				)
			)
			.orderBy(table.userGroupTable.name);
	}
);

// get count
export const getUserGroupCount = query(async (): Promise<number> => {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.userGroupTable);
	return row?.count ?? 0;
});

// get paginated (optional hospitalId to scope to one hospital, plus filters)
export const getUserGroupPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<UserGroupSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const hospitalId = params?.hospitalId;
		const nameFilter = params?.name?.trim();
		const statusId = params?.statusId;

		const conditions = [
			ne(table.userGroupTable.statusId, StatusEnum.DELETED)
		];

		if (hospitalId != null && hospitalId !== '') {
			conditions.push(
				eq(table.userGroupTable.hospitalId, hospitalId)
			);
		}
		if (nameFilter) {
			conditions.push(
				ilike(table.userGroupTable.name, `%${nameFilter}%`)
			);
		}
		if (typeof statusId === 'number') {
			conditions.push(eq(table.userGroupTable.statusId, statusId));
		}

		const whereClause = and(...conditions);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.userGroupTable)
				.where(whereClause)
				.orderBy(table.userGroupTable.name)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.userGroupTable)
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
);

// get all with relations
export const getUserGroupWithRelations = query(async () => {
	return ensureDb().query.userGroupTable.findMany({
		with: {
			status: true,
			hospital: true,
			userGroupPages: { with: { page: true } }
		}
	});
});

// get one with relations
export const getUserGroupByIdWithRelations = query(
	'unchecked' as const,
	async ({ id }: { id: number }) => {
		return ensureDb().query.userGroupTable.findFirst({
			where: (t, { eq }) => eq(t.id, id),
			with: {
				status: true,
				hospital: true,
				userGroupPages: { with: { page: true } }
			}
		});
	}
);

// get one
export const getUserGroupById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<UserGroupSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.userGroupTable)
			.where(eq(table.userGroupTable.id, id));
		return row ?? null;
	}
);

// create (hospitalId required when creating from hospital admin)
export const createUserGroup = command(
	'unchecked' as const,
	async (
		payload: UserGroupSchemaInsert
	): Promise<UserGroupSchema> => {
		const [row] = await ensureDb()
			.insert(table.userGroupTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getUserGroup(undefined).refresh();
		getUserGroupPaginated(undefined).refresh();
		return row;
	}
);

// update
export const updateUserGroup = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		statusId?: number | null;
	}): Promise<UserGroupSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.userGroupTable)
			.set(rest as UserGroupSchemaUpdate)
			.where(eq(table.userGroupTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getUserGroup(undefined).refresh();
		getUserGroupPaginated(undefined).refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteUserGroup = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.userGroupTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.userGroupTable.id, id));
		getUserGroup(undefined).refresh();
		getUserGroupPaginated(undefined).refresh();
	}
);

// delete complete (hard)
export const deleteUserGroupComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.userGroupTable)
			.where(eq(table.userGroupTable.id, id));
		getUserGroup(undefined).refresh();
		getUserGroupPaginated(undefined).refresh();
	}
);
