import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';

export async function branchIdsForHospital(
	hospitalId: string
): Promise<string[]> {
	const rows = await ensureDb()
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(eq(table.hospitalBranchTable.hospitalId, hospitalId));
	return rows.map((r) => r.id);
}

export async function assertStoreInHospital(
	hospitalId: string,
	storeId: number
): Promise<typeof table.storeTable.$inferSelect> {
	const ids = await branchIdsForHospital(hospitalId);
	if (ids.length === 0) throw error(400, 'No branches for hospital');
	const [row] = await ensureDb()
		.select()
		.from(table.storeTable)
		.where(
			and(
				eq(table.storeTable.id, storeId),
				inArray(table.storeTable.branchId, ids),
				sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`
			)
		)
		.limit(1);
	if (!row) throw error(400, 'Invalid or inaccessible store');
	return row;
}

export async function getStaffIdForUser(
	userId: string
): Promise<string | null> {
	const [r] = await ensureDb()
		.select({ id: table.staffTable.id })
		.from(table.staffTable)
		.where(
			and(
				eq(table.staffTable.userId, userId),
				sql`${table.staffTable.statusId} <> ${StatusEnum.DELETED}`
			)
		)
		.limit(1);
	return r?.id ?? null;
}

export async function ensureHospitalInventoryAccess(
	event: RequestEvent,
	hospitalId: string
): Promise<void> {
	await ensureCanAccessHospital(event, hospitalId);
}
