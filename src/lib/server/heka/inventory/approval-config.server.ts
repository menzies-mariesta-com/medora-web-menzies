import { error, type RequestEvent } from '@sveltejs/kit';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	assertStoreInHospital,
	branchIdsForHospital,
	ensureHospitalInventoryAccess
} from './inventory-scope.server';

export type InvApprovalModule = 'PR' | 'PO';

export async function listApprovalLevelsForStore(
	event: RequestEvent,
	input: { hospitalId: string; storeId: number; module?: InvApprovalModule }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	await assertStoreInHospital(input.hospitalId, input.storeId);

	const conds = [
		eq(table.invApprovalLevelTable.hospitalId, input.hospitalId),
		eq(table.invApprovalLevelTable.storeId, input.storeId),
		isNull(table.invApprovalLevelTable.deletedAt)
	];
	if (input.module) {
		conds.push(eq(table.invApprovalLevelTable.module, input.module));
	}

	const levels = await ensureDb()
		.select()
		.from(table.invApprovalLevelTable)
		.where(and(...conds))
		.orderBy(
			table.invApprovalLevelTable.module,
			asc(table.invApprovalLevelTable.level)
		);

	const levelIds = levels.map((l) => l.id);
	const assignees =
		levelIds.length === 0
			? []
			: await ensureDb()
					.select({
						id: table.invApprovalAssigneeTable.id,
						levelId: table.invApprovalAssigneeTable.levelId,
						staffId: table.invApprovalAssigneeTable.staffId,
						firstName: table.staffTable.firstName,
						middleName: table.staffTable.middleName,
						lastName: table.staffTable.lastName,
						code: table.staffTable.code
					})
					.from(table.invApprovalAssigneeTable)
					.innerJoin(
						table.staffTable,
						eq(
							table.invApprovalAssigneeTable.staffId,
							table.staffTable.id
						)
					)
					.where(
						inArray(table.invApprovalAssigneeTable.levelId, levelIds)
					);

	const byLevel = new Map<number, typeof assignees>();
	for (const a of assignees) {
		const list = byLevel.get(a.levelId) ?? [];
		list.push(a);
		byLevel.set(a.levelId, list);
	}

	return levels.map((l) => ({
		...l,
		assignees: byLevel.get(l.id) ?? []
	}));
}

export async function upsertApprovalLevel(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId: number;
		module: InvApprovalModule;
		level: number;
		isRequired?: boolean;
		id?: number;
		assigneeStaffIds: string[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	await assertStoreInHospital(input.hospitalId, input.storeId);

	if (input.level < 1) throw error(400, 'Invalid level');

	const userId = event.locals.user?.id ?? null;
	if (!userId) throw error(401, 'Unauthorized');

	await ensureDb().transaction(async (tx) => {
		let levelId = input.id;
		if (levelId) {
			const [existing] = await tx
				.select()
				.from(table.invApprovalLevelTable)
				.where(
					and(
						eq(table.invApprovalLevelTable.id, levelId),
						eq(
							table.invApprovalLevelTable.hospitalId,
							input.hospitalId
						),
						isNull(table.invApprovalLevelTable.deletedAt)
					)
				)
				.limit(1);
			if (!existing) throw error(404, 'Level not found');
			await tx
				.update(table.invApprovalLevelTable)
				.set({
					isRequired: input.isRequired ?? existing.isRequired,
					updatedBy: userId
				})
				.where(eq(table.invApprovalLevelTable.id, levelId));
			await tx
				.delete(table.invApprovalAssigneeTable)
				.where(
					eq(table.invApprovalAssigneeTable.levelId, levelId)
				);
		} else {
			const [created] = await tx
				.insert(table.invApprovalLevelTable)
				.values({
					hospitalId: input.hospitalId,
					storeId: input.storeId,
					module: input.module,
					level: input.level,
					isRequired: input.isRequired ?? true,
					createdBy: userId,
					updatedBy: userId
				})
				.returning({ id: table.invApprovalLevelTable.id });
			if (!created) throw error(500, 'Failed to create level');
			levelId = created.id;
		}

		if (input.assigneeStaffIds.length > 0) {
			await tx.insert(table.invApprovalAssigneeTable).values(
				input.assigneeStaffIds.map((staffId) => ({
					levelId: levelId!,
					staffId
				}))
			);
		}
	});

	return { ok: true };
}

export async function deleteApprovalLevel(
	event: RequestEvent,
	input: { hospitalId: string; levelId: number }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id ?? null;
	if (!userId) throw error(401, 'Unauthorized');

	const [row] = await ensureDb()
		.select()
		.from(table.invApprovalLevelTable)
		.where(
			and(
				eq(table.invApprovalLevelTable.id, input.levelId),
				eq(
					table.invApprovalLevelTable.hospitalId,
					input.hospitalId
				),
				isNull(table.invApprovalLevelTable.deletedAt)
			)
		)
		.limit(1);
	if (!row) throw error(404, 'Level not found');

	await ensureDb()
		.update(table.invApprovalLevelTable)
		.set({
			deletedAt: sql`now()`,
			deletedBy: userId
		})
		.where(eq(table.invApprovalLevelTable.id, input.levelId));
}

export async function listStoresForApprovalConfig(
	event: RequestEvent,
	hospitalId: string
) {
	await ensureHospitalInventoryAccess(event, hospitalId);
	const ids = await branchIdsForHospital(hospitalId);
	if (ids.length === 0) return [];
	return ensureDb()
		.select()
		.from(table.storeTable)
		.where(
			and(
				inArray(table.storeTable.branchId, ids),
				sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`
			)
		)
		.orderBy(table.storeTable.storeName);
}
