import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	HospitalBranchSchema,
	HospitalBranchSchemaInsert,
	HospitalBranchSchemaUpdate
} from '$lib/server/db/schema-type';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';

async function ensureCanManageHospital(
	event: RequestEvent,
	hospitalId: string
): Promise<void> {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
	const userRoleId = event.locals.userRoleId ?? null;
	const userId = event.locals.user?.id ?? null;
	const allowedHospitalIds = event.locals.allowedHospitalIds ?? [];

	if (userRoleId === RoleEnum.SYSTEM_ADMIN) return;
	if (userRoleId === RoleEnum.OWNER && userId) {
		const [h] = await ensureDb()
			.select({ ownerId: table.hospitalTable.ownerId })
			.from(table.hospitalTable)
			.where(eq(table.hospitalTable.id, hospitalId))
			.limit(1);
		if (!h || h.ownerId !== userId)
			throw error(
				403,
				'You can only manage branches of your own hospitals'
			);
		return;
	}
	if (userRoleId === RoleEnum.STAFF) {
		if (!allowedHospitalIds.includes(hospitalId))
			throw error(403, 'You do not have access to this hospital');
		return;
	}
	throw error(403, 'Forbidden');
}

export async function getBranchesByHospitalId(event: RequestEvent, input: {
	hospitalId: string;
}): Promise<HospitalBranchSchema[]> {
	await ensureCanManageHospital(event, input.hospitalId);
	return ensureDb()
		.select()
		.from(table.hospitalBranchTable)
		.where(
			and(
				eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
				eq(table.hospitalBranchTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(table.hospitalBranchTable.name);
}

export async function getBranchesByHospitalIdPaginated(
	event: RequestEvent,
	params: PaginationParams & { hospitalId: string; statusId?: number | null }
): Promise<PaginatedResult<HospitalBranchSchema>> {
	await ensureCanManageHospital(event, params.hospitalId);
	const { page, pageSize, limit, offset } = normalizePagination(params);

	const hospitalEq = eq(
		table.hospitalBranchTable.hospitalId,
		params.hospitalId
	);
	const whereExpr =
		params?.statusId != null
			? and(
					hospitalEq,
					eq(table.hospitalBranchTable.statusId, params.statusId)
				)
			: hospitalEq;

	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.hospitalBranchTable)
			.where(whereExpr)
			.orderBy(desc(table.hospitalBranchTable.id))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.hospitalBranchTable)
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

export async function getBranchById(
	event: RequestEvent,
	input: { id: string }
): Promise<HospitalBranchSchema | null> {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
	const [row] = await ensureDb()
		.select()
		.from(table.hospitalBranchTable)
		.where(eq(table.hospitalBranchTable.id, input.id))
		.limit(1);
	if (!row) return null;
	await ensureCanManageHospital(event, row.hospitalId);
	return row;
}

export async function createBranch(
	event: RequestEvent,
	input: HospitalBranchSchemaInsert
): Promise<HospitalBranchSchema> {
	await ensureCanManageHospital(event, input.hospitalId);
	const [inserted] = await ensureDb()
		.insert(table.hospitalBranchTable)
		.values(input)
		.returning();
	if (!inserted) throw new Error('Failed to create branch');
	return inserted;
}

export async function updateBranch(
	event: RequestEvent,
	input: HospitalBranchSchemaUpdate & { id: string }
): Promise<HospitalBranchSchema> {
	const [branch] = await ensureDb()
		.select({ hospitalId: table.hospitalBranchTable.hospitalId })
		.from(table.hospitalBranchTable)
		.where(eq(table.hospitalBranchTable.id, input.id))
		.limit(1);
	if (!branch) throw error(404, 'Branch not found');
	await ensureCanManageHospital(event, branch.hospitalId);
	const { id, ...data } = input;
	const [updated] = await ensureDb()
		.update(table.hospitalBranchTable)
		.set(data)
		.where(eq(table.hospitalBranchTable.id, id))
		.returning();
	if (!updated) throw new Error('Branch not found');
	return updated;
}

export async function deleteBranch(
	event: RequestEvent,
	input: { id: string }
): Promise<void> {
	const [branch] = await ensureDb()
		.select({ hospitalId: table.hospitalBranchTable.hospitalId })
		.from(table.hospitalBranchTable)
		.where(eq(table.hospitalBranchTable.id, input.id))
		.limit(1);
	if (!branch) throw error(404, 'Branch not found');
	await ensureCanManageHospital(event, branch.hospitalId);
	await ensureDb()
		.update(table.hospitalBranchTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.hospitalBranchTable.id, input.id));
}

