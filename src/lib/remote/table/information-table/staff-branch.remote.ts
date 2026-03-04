import { command, query } from '$app/server';
import { error } from '@sveltejs/kit';
import { and, count, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StaffBranchSchema,
	StaffBranchSchemaInsert,
	StaffBranchSchemaUpdate
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';

async function ensureStaffAndBranchAreInHospital(input: {
	staffId: string;
	branchId: string;
	hospitalId: string;
}): Promise<void> {
	const [branch] = await ensureDb()
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(
			and(
				eq(table.hospitalBranchTable.id, input.branchId),
				eq(table.hospitalBranchTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!branch)
		throw error(
			400,
			'Branch does not belong to the selected hospital'
		);

	const [staffHospital] = await ensureDb()
		.select({ id: table.staffHospitalTable.id })
		.from(table.staffHospitalTable)
		.where(
			and(
				eq(table.staffHospitalTable.staffId, input.staffId),
				eq(table.staffHospitalTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!staffHospital)
		throw error(
			400,
			'Staff is not assigned to the selected hospital'
		);
}

export const getStaffBranch = query(
	async (): Promise<StaffBranchSchema[]> => {
		return ensureDb().select().from(table.staffBranchTable);
	}
);

export const getStaffBranchCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.staffBranchTable);
		return row?.count ?? 0;
	}
);

export const getStaffBranchPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<StaffBranchSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.staffBranchTable)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.staffBranchTable)
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

export const getStaffBranchByStaffAndHospital = query(
	'unchecked' as const,
	async ({
		staffId,
		hospitalId
	}: {
		staffId: string;
		hospitalId: string;
	}): Promise<StaffBranchSchema[]> => {
		return ensureDb()
			.select({
				id: table.staffBranchTable.id,
				staffId: table.staffBranchTable.staffId,
				branchId: table.staffBranchTable.branchId,
				createdAt: table.staffBranchTable.createdAt,
				updatedAt: table.staffBranchTable.updatedAt
			})
			.from(table.staffBranchTable)
			.innerJoin(
				table.hospitalBranchTable,
				eq(
					table.staffBranchTable.branchId,
					table.hospitalBranchTable.id
				)
			)
			.where(
				and(
					eq(table.staffBranchTable.staffId, staffId),
					eq(table.hospitalBranchTable.hospitalId, hospitalId)
				)
			);
	}
);

export const createStaffBranch = command(
	'unchecked' as const,
	async (
		payload: StaffBranchSchemaInsert & {
			hospitalId: string;
		}
	): Promise<StaffBranchSchema> => {
		await ensureStaffAndBranchAreInHospital(payload);
		const [existing] = await ensureDb()
			.select({ id: table.staffBranchTable.id })
			.from(table.staffBranchTable)
			.where(
				and(
					eq(table.staffBranchTable.staffId, payload.staffId),
					eq(table.staffBranchTable.branchId, payload.branchId)
				)
			)
			.limit(1);
		if (existing) {
			throw error(409, 'Staff is already assigned to this branch');
		}

		const { hospitalId: _hospitalId, ...values } = payload;
		const [row] = await ensureDb()
			.insert(table.staffBranchTable)
			.values(values)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaffBranch().refresh();
		return row;
	}
);

export const updateStaffBranch = command(
	'unchecked' as const,
	async (
		payload: {
			id: number;
			hospitalId: string;
		} & StaffBranchSchemaUpdate
	): Promise<StaffBranchSchema> => {
		const { id, hospitalId, ...rest } = payload;
		if (!rest.staffId || !rest.branchId) {
			throw error(
				400,
				'staffId and branchId are required to update staff branch'
			);
		}
		await ensureStaffAndBranchAreInHospital({
			staffId: rest.staffId,
			branchId: rest.branchId,
			hospitalId
		});
		const [row] = await ensureDb()
			.update(table.staffBranchTable)
			.set(rest)
			.where(eq(table.staffBranchTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaffBranch().refresh();
		return row;
	}
);

export const deleteStaffBranch = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.staffBranchTable)
			.where(eq(table.staffBranchTable.id, id));
		getStaffBranch().refresh();
	}
);
