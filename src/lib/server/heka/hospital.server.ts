import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	HospitalSchema,
	HospitalSchemaInsert,
	HospitalSchemaUpdate
} from '$lib/server/db/schema-type';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';

export type HospitalWithOwner = HospitalSchema & {
	owner?: { id: string; name: string | null; email: string } | null;
};

function requireUser(event: RequestEvent): {
	userId: string;
	userRoleId: number | null;
} {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
	return {
		userId: event.locals.user.id,
		userRoleId: event.locals.userRoleId ?? null
	};
}

function assertCanManageHospitals(userRoleId: number | null): void {
	if (userRoleId === RoleEnum.STAFF)
		throw error(403, 'Staff cannot manage hospitals');
}

function resolveEffectiveOwnerId(
	event: RequestEvent,
	ownerIdFromClient?: string | null
): string | undefined {
	const userRoleId = event.locals.userRoleId ?? null;
	const userId = event.locals.user?.id ?? null;
	if (userRoleId === RoleEnum.OWNER && userId) return userId;
	return ownerIdFromClient ?? undefined;
}

export async function getHospitalsWithOwnerPaginated(
	event: RequestEvent,
	params?: PaginationParams & { ownerId?: string | null }
): Promise<PaginatedResult<HospitalWithOwner>> {
	requireUser(event);

	const effectiveOwnerId = resolveEffectiveOwnerId(event, params?.ownerId);
	const { page, pageSize, limit, offset } = normalizePagination(params);

	const hasOwnerFilter =
		effectiveOwnerId != null && effectiveOwnerId !== '';
	let whereExpr = hasOwnerFilter
		? eq(table.hospitalTable.ownerId, effectiveOwnerId!)
		: undefined;

	if (params?.statusId != null) {
		const statusEq = eq(table.hospitalTable.statusId, params.statusId);
		whereExpr = whereExpr != null ? and(whereExpr, statusEq) : statusEq;
	}

	const db = ensureDb();
	const baseOpts = {
		limit,
		offset,
		with: {
			owner: { columns: { id: true, name: true, email: true } }
		}
	} as const;

	const [data, countResult] = await Promise.all([
		whereExpr != null
			? (db.query.hospitalTable.findMany({
					...baseOpts,
					where: whereExpr
				}) as Promise<HospitalWithOwner[]>)
			: (db.query.hospitalTable.findMany(
					baseOpts
				) as Promise<HospitalWithOwner[]>),
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

export async function createHospital(
	event: RequestEvent,
	input: HospitalSchemaInsert
): Promise<HospitalSchema> {
	const { userId, userRoleId } = requireUser(event);
	assertCanManageHospitals(userRoleId);

	const values = { ...input };
	if (userRoleId === RoleEnum.OWNER) values.ownerId = userId;

	const [inserted] = await ensureDb()
		.insert(table.hospitalTable)
		.values(values)
		.returning();
	if (!inserted) throw error(500, 'Failed to create hospital');
	return inserted;
}

export async function updateHospital(
	event: RequestEvent,
	payload: HospitalSchemaUpdate & { id: string }
): Promise<HospitalSchema> {
	const { userId, userRoleId } = requireUser(event);
	assertCanManageHospitals(userRoleId);

	const { id, ...data } = payload;
	if (!id) throw error(400, 'Hospital id is required');

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
	if (!updated) throw error(404, 'Hospital not found');
	return updated;
}

export async function getHospitalById(
	event: RequestEvent,
	id: string
): Promise<HospitalWithOwner | null> {
	const { userId, userRoleId } = requireUser(event);
	assertCanManageHospitals(userRoleId);
	if (!id) throw error(400, 'Hospital id is required');

	const row = await ensureDb().query.hospitalTable.findFirst({
		where: eq(table.hospitalTable.id, id),
		with: {
			owner: { columns: { id: true, name: true, email: true } }
		}
	});
	if (!row) return null;
	if (userRoleId === RoleEnum.OWNER && row.ownerId !== userId) {
		throw error(403, 'You can only view your own hospitals');
	}
	return row as HospitalWithOwner;
}

export async function deleteHospital(
	event: RequestEvent,
	{ id }: { id: string }
): Promise<void> {
	const { userId, userRoleId } = requireUser(event);
	assertCanManageHospitals(userRoleId);
	if (!id) throw error(400, 'Hospital id is required');

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
}

