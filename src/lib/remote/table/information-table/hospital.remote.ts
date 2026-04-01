import { command, query, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	HospitalSchema,
	HospitalSchemaInsert,
	HospitalSchemaUpdate
} from '$lib/server/db/schema-type';
import { and, count, eq } from 'drizzle-orm';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';

// get all (for dropdowns and list)
export const getHospital = query(
	async (): Promise<HospitalSchema[]> => {
		const data = await ensureDb().select().from(table.hospitalTable);
		return data;
	}
);

export type HospitalWithOwner = HospitalSchema & {
	owner?: { id: string; name: string | null; email: string } | null;
};

/** Hospitals with owner relation for list. Server enforces: OWNER only sees their hospitals; SYSTEM_ADMIN sees all. */
export const getHospitalWithOwner = query(
	'unchecked' as const,
	async (params?: {
		ownerId?: string | null;
	}): Promise<HospitalWithOwner[]> => {
		const event = getRequestEvent();
		const userRoleId = event?.locals?.userRoleId ?? null;
		const userId = event?.locals?.user?.id ?? null;
		// OWNER: ignore client param and restrict to their hospitals
		const effectiveOwnerId =
			userRoleId === RoleEnum.OWNER && userId
				? userId
				: (params?.ownerId ?? undefined);
		return ensureDb().query.hospitalTable.findMany({
			with: {
				owner: {
					columns: { id: true, name: true, email: true }
				}
			},
			...(effectiveOwnerId != null &&
				effectiveOwnerId !== '' && {
					where: (h, { eq }) => eq(h.ownerId, effectiveOwnerId)
				})
		}) as Promise<HospitalWithOwner[]>;
	}
);

/** Hospitals with owner (paginated). Same access rules as getHospitalWithOwner. */
export const getHospitalWithOwnerPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & {
			ownerId?: string | null;
			statusId?: number | null;
		}
	): Promise<PaginatedResult<HospitalWithOwner>> => {
		const event = getRequestEvent();
		const userRoleId = event?.locals?.userRoleId ?? null;
		const userId = event?.locals?.user?.id ?? null;
		const effectiveOwnerId =
			userRoleId === RoleEnum.OWNER && userId
				? userId
				: (params?.ownerId ?? undefined);
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const db = ensureDb();
		const hasOwnerFilter =
			effectiveOwnerId != null && effectiveOwnerId !== '';
		let whereExpr = hasOwnerFilter
			? eq(table.hospitalTable.ownerId, effectiveOwnerId!)
			: undefined;
		if (params?.statusId != null) {
			const statusEq = eq(
				table.hospitalTable.statusId,
				params.statusId
			);
			whereExpr =
				whereExpr != null ? and(whereExpr, statusEq) : statusEq;
		}
		const baseOpts = {
			limit,
			offset,
			with: {
				owner: {
					columns: { id: true, name: true, email: true }
				}
			}
		};
		const [data, countResult] = await Promise.all([
			whereExpr != null
				? (db.query.hospitalTable.findMany({
						...baseOpts,
						where: whereExpr
					}) as Promise<HospitalWithOwner[]>)
				: (db.query.hospitalTable.findMany(baseOpts) as Promise<
						HospitalWithOwner[]
					>),
			whereExpr != null
				? db
						.select({ count: count() })
						.from(table.hospitalTable)
						.where(whereExpr)
				: db.select({ count: count() }).from(table.hospitalTable)
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

// get by id (for code generation, edit form, etc.)
export const getHospitalById = query(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<HospitalSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.hospitalTable)
			.where(eq(table.hospitalTable.id, id));
		return row ?? null;
	}
);

export const createHospital = command(
	'unchecked' as const,
	async (input: HospitalSchemaInsert): Promise<HospitalSchema> => {
		const event = getRequestEvent();
		if (!event?.locals?.user) throw error(401, 'Unauthorized');
		const userRoleId = event.locals.userRoleId ?? null;
		const userId = event.locals.user.id;
		if (userRoleId === RoleEnum.STAFF)
			throw error(403, 'Staff cannot create hospitals');
		const values = { ...input };
		if (userRoleId === RoleEnum.OWNER) {
			values.ownerId = userId;
		}
		const [inserted] = await ensureDb()
			.insert(table.hospitalTable)
			.values(values)
			.returning();
		if (!inserted) throw new Error('Failed to create hospital');
		getHospital().refresh();
		getHospitalWithOwner(undefined).refresh();
		return inserted;
	}
);

export const updateHospital = command(
	'unchecked' as const,
	async ({
		id,
		...data
	}: HospitalSchemaUpdate & {
		id: string;
	}): Promise<HospitalSchema> => {
		const event = getRequestEvent();
		if (!event?.locals?.user) throw error(401, 'Unauthorized');
		const userRoleId = event.locals.userRoleId ?? null;
		const userId = event.locals.user.id;
		if (userRoleId === RoleEnum.STAFF)
			throw error(403, 'Staff cannot update hospitals');
		if (userRoleId === RoleEnum.OWNER) {
			const [hospital] = await ensureDb()
				.select({ ownerId: table.hospitalTable.ownerId })
				.from(table.hospitalTable)
				.where(eq(table.hospitalTable.id, id))
				.limit(1);
			if (!hospital || hospital.ownerId !== userId)
				throw error(403, 'You can only update your own hospitals');
			data.ownerId = userId;
		}
		const [updated] = await ensureDb()
			.update(table.hospitalTable)
			.set(data)
			.where(eq(table.hospitalTable.id, id))
			.returning();
		if (!updated) throw new Error('Hospital not found');
		getHospital().refresh();
		getHospitalWithOwner(undefined).refresh();
		return updated;
	}
);

export const deleteHospital = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		const event = getRequestEvent();
		if (!event?.locals?.user) throw error(401, 'Unauthorized');
		const userRoleId = event.locals.userRoleId ?? null;
		const userId = event.locals.user.id;
		if (userRoleId === RoleEnum.STAFF)
			throw error(403, 'Staff cannot delete hospitals');
		if (userRoleId === RoleEnum.OWNER) {
			const [hospital] = await ensureDb()
				.select({ ownerId: table.hospitalTable.ownerId })
				.from(table.hospitalTable)
				.where(eq(table.hospitalTable.id, id))
				.limit(1);
			if (!hospital || hospital.ownerId !== userId)
				throw error(403, 'You can only delete your own hospitals');
		}
		await ensureDb()
			.update(table.hospitalTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.hospitalTable.id, id));
		getHospital().refresh();
		getHospitalWithOwner(undefined).refresh();
	}
);
