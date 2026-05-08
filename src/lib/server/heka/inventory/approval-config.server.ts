import { error, type RequestEvent } from '@sveltejs/kit';
import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	assertStoreInHospital,
	branchIdsForHospital,
	ensureHospitalInventoryAccess
} from './inventory-scope.server';
import type { InvApprovalModule } from '$lib/model/type/heka/inv-approval.type';

export type { InvApprovalModule } from '$lib/model/type/heka/inv-approval.type';

function pgErrorCode(e: unknown): string | undefined {
	let current: unknown = e;
	for (let i = 0; i < 5; i++) {
		if (current && typeof current === 'object' && 'code' in current) {
			const c = (current as { code?: string }).code;
			if (c) return c;
		}
		if (current && typeof current === 'object' && 'cause' in current) {
			current = (current as { cause: unknown }).cause;
			continue;
		}
		break;
	}
	return undefined;
}

export async function listApprovalLevelsForStore(
	event: RequestEvent,
	input: { hospitalId: string; storeId: number; module?: InvApprovalModule }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	await assertStoreInHospital(input.hospitalId, input.storeId);

	const conds = [
		eq(table.invApprovalLevelTable.hospitalId, input.hospitalId),
		eq(table.invApprovalLevelTable.storeId, input.storeId),
		// Approval config is single-level for now: always level 1.
		eq(table.invApprovalLevelTable.level, 1),
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
		isRequired?: boolean;
		id?: number;
		assigneeStaffIds: string[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	await assertStoreInHospital(input.hospitalId, input.storeId);

	const userId = event.locals.user?.id ?? null;
	if (!userId) throw error(401, 'Unauthorized');

	try {
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
						eq(table.invApprovalLevelTable.level, 1),
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
			/** Re-use a soft-deleted row (full unique on old DBs still blocks a second insert). */
			const [tomb] = await tx
				.select()
				.from(table.invApprovalLevelTable)
				.where(
					and(
						eq(
							table.invApprovalLevelTable.hospitalId,
							input.hospitalId
						),
						eq(table.invApprovalLevelTable.storeId, input.storeId),
						eq(
							table.invApprovalLevelTable.module,
							input.module
						),
						eq(table.invApprovalLevelTable.level, 1),
						isNotNull(table.invApprovalLevelTable.deletedAt)
					)
				)
				.limit(1);
			if (tomb) {
				await tx
					.update(table.invApprovalLevelTable)
					.set({
						deletedAt: null,
						deletedBy: null,
						isRequired: input.isRequired ?? true,
						updatedBy: userId
					})
					.where(
						eq(
							table.invApprovalLevelTable.id,
							tomb.id
						)
					);
				await tx
					.delete(table.invApprovalAssigneeTable)
					.where(
						eq(
							table.invApprovalAssigneeTable.levelId,
							tomb.id
						)
					);
				levelId = tomb.id;
			} else {
				const [created] = await tx
					.insert(table.invApprovalLevelTable)
					.values({
						hospitalId: input.hospitalId,
						storeId: input.storeId,
						module: input.module,
						level: 1,
						isRequired: input.isRequired ?? true,
						createdBy: userId,
						updatedBy: userId
					})
					.returning({ id: table.invApprovalLevelTable.id });
				if (!created) throw error(500, 'Failed to create level');
				levelId = created.id;
			}
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
	} catch (e) {
		const code = pgErrorCode(e);
		if (code === '23514') {
			console.error(
				'[inv_approval_level] Check violation: update DB module check (e.g. run drizzle/manual_inv_approval_module_check.sql or migrations 0039+0040).',
				e
			);
			throw error(
				400,
				'This approval type cannot be saved until the database is updated. Please contact an administrator.'
			);
		}
		if (code === '23505') {
			throw error(
				409,
				'This approval config already exists for the store and module.'
			);
		}
		throw e;
	}

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
	hospitalId: string,
	opts?: { userGroupId?: number | null }
) {
	await ensureHospitalInventoryAccess(event, hospitalId);
	const ids = await branchIdsForHospital(hospitalId);
	if (ids.length === 0) return [];

	const userGroupId =
		opts?.userGroupId != null && Number.isInteger(opts.userGroupId)
			? opts.userGroupId
			: null;

	if (userGroupId != null) {
		// Inventory ops store list is limited by selected user group.
		const storeIds = await ensureDb()
			.selectDistinct({ id: table.storeUserGroupTable.storeId })
			.from(table.storeUserGroupTable)
			.innerJoin(
				table.storeTable,
				eq(table.storeTable.id, table.storeUserGroupTable.storeId)
			)
			.where(
				and(
					inArray(table.storeTable.branchId, ids),
					sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`,
					eq(table.storeUserGroupTable.userGroupId, userGroupId)
				)
			)
			.orderBy(table.storeUserGroupTable.storeId);

		const uniqueStoreIds = storeIds.map((r) => r.id);
		if (uniqueStoreIds.length === 0) return [];

		return ensureDb()
			.select()
			.from(table.storeTable)
			.where(inArray(table.storeTable.id, uniqueStoreIds))
			.orderBy(table.storeTable.storeName);
	}

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
