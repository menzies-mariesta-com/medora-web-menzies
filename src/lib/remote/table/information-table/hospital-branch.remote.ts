import { command, query, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	HospitalBranchSchema,
	HospitalBranchSchemaInsert,
	HospitalBranchSchemaUpdate
} from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';
import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';

/** Ensure the current user can manage branches for this hospital. */
async function ensureCanManageHospital(
	hospitalId: string
): Promise<void> {
	const event = getRequestEvent();
	if (!event?.locals?.user) throw error(401, 'Unauthorized');
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

/** List branches for a hospital. */
export const getBranchesByHospitalId = query(
	'unchecked' as const,
	async ({
		hospitalId
	}: {
		hospitalId: string;
	}): Promise<HospitalBranchSchema[]> => {
		return ensureDb()
			.select()
			.from(table.hospitalBranchTable)
			.where(eq(table.hospitalBranchTable.hospitalId, hospitalId))
			.orderBy(table.hospitalBranchTable.name);
	}
);

/** List branches for a hospital (paginated). */
export const getBranchesByHospitalIdPaginated = query(
	'unchecked' as const,
	async (
		params: PaginationParams & { hospitalId: string }
	): Promise<PaginatedResult<HospitalBranchSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const whereExpr = eq(
			table.hospitalBranchTable.hospitalId,
			params.hospitalId
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.hospitalBranchTable)
				.where(whereExpr)
				.orderBy(table.hospitalBranchTable.name)
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
);

/** Get one branch by id. */
export const getBranchById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: string;
	}): Promise<HospitalBranchSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.hospitalBranchTable)
			.where(eq(table.hospitalBranchTable.id, id))
			.limit(1);
		return row ?? null;
	}
);

export const createBranch = command(
	'unchecked' as const,
	async (
		input: HospitalBranchSchemaInsert
	): Promise<HospitalBranchSchema> => {
		await ensureCanManageHospital(input.hospitalId);
		const [inserted] = await ensureDb()
			.insert(table.hospitalBranchTable)
			.values(input)
			.returning();
		if (!inserted) throw new Error('Failed to create branch');
		getBranchesByHospitalId({
			hospitalId: input.hospitalId
		}).refresh();
		return inserted;
	}
);

export const updateBranch = command(
	'unchecked' as const,
	async ({
		id,
		...data
	}: HospitalBranchSchemaUpdate & {
		id: string;
	}): Promise<HospitalBranchSchema> => {
		const [branch] = await ensureDb()
			.select({ hospitalId: table.hospitalBranchTable.hospitalId })
			.from(table.hospitalBranchTable)
			.where(eq(table.hospitalBranchTable.id, id))
			.limit(1);
		if (!branch) throw error(404, 'Branch not found');
		await ensureCanManageHospital(branch.hospitalId);
		// Do not allow moving branch to another hospital via update (if we add hospitalId to update later, validate)
		const [updated] = await ensureDb()
			.update(table.hospitalBranchTable)
			.set(data)
			.where(eq(table.hospitalBranchTable.id, id))
			.returning();
		if (!updated) throw new Error('Branch not found');
		getBranchesByHospitalId({
			hospitalId: branch.hospitalId
		}).refresh();
		return updated;
	}
);

export const deleteBranch = command(
	'unchecked' as const,
	async ({ id }: { id: string }): Promise<void> => {
		const [branch] = await ensureDb()
			.select({ hospitalId: table.hospitalBranchTable.hospitalId })
			.from(table.hospitalBranchTable)
			.where(eq(table.hospitalBranchTable.id, id))
			.limit(1);
		if (!branch) throw error(404, 'Branch not found');
		await ensureCanManageHospital(branch.hospitalId);
		await ensureDb()
			.update(table.hospitalBranchTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.hospitalBranchTable.id, id));
		getBranchesByHospitalId({
			hospitalId: branch.hospitalId
		}).refresh();
	}
);
