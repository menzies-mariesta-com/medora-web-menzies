import { error } from '@sveltejs/kit';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { InvApprovalModule } from './approval-config.server';

/**
 * Permission-style check: staff must be assigned to ANY level for the store+module.
 * Used for GRN posting/transfer where we don't run a multi-level workflow.
 */
export async function assertStaffAssignedForModule(
	hospitalId: string,
	storeId: number,
	module: InvApprovalModule,
	staffId: string
): Promise<void> {
	const [asg] = await ensureDb()
		.select({ id: table.invApprovalAssigneeTable.id })
		.from(table.invApprovalAssigneeTable)
		.innerJoin(
			table.invApprovalLevelTable,
			eq(table.invApprovalAssigneeTable.levelId, table.invApprovalLevelTable.id)
		)
		.where(
			and(
				eq(table.invApprovalLevelTable.hospitalId, hospitalId),
				eq(table.invApprovalLevelTable.storeId, storeId),
				eq(table.invApprovalLevelTable.module, module),
				eq(table.invApprovalAssigneeTable.staffId, staffId),
				isNull(table.invApprovalLevelTable.deletedAt)
			)
		)
		.limit(1);
	if (!asg) throw error(403, 'You are not assigned for this action');
}

export async function getMaxApprovalLevel(
	hospitalId: string,
	storeId: number,
	module: InvApprovalModule
): Promise<number> {
	const [row] = await ensureDb()
		.select({
			m: sql<number>`max(${table.invApprovalLevelTable.level})`.mapWith(
				Number
			)
		})
		.from(table.invApprovalLevelTable)
		.where(
			and(
				eq(table.invApprovalLevelTable.hospitalId, hospitalId),
				eq(table.invApprovalLevelTable.storeId, storeId),
				eq(table.invApprovalLevelTable.module, module),
				isNull(table.invApprovalLevelTable.deletedAt)
			)
		);
	return row?.m ?? 0;
}

export async function assertStaffCanApproveLevel(
	hospitalId: string,
	storeId: number,
	module: InvApprovalModule,
	level: number,
	staffId: string
): Promise<void> {
	const [lvl] = await ensureDb()
		.select({ id: table.invApprovalLevelTable.id })
		.from(table.invApprovalLevelTable)
		.where(
			and(
				eq(table.invApprovalLevelTable.hospitalId, hospitalId),
				eq(table.invApprovalLevelTable.storeId, storeId),
				eq(table.invApprovalLevelTable.module, module),
				eq(table.invApprovalLevelTable.level, level),
				isNull(table.invApprovalLevelTable.deletedAt)
			)
		)
		.limit(1);
	if (!lvl)
		throw error(
			400,
			'No approval level configured for this store and module'
		);

	const [asg] = await ensureDb()
		.select({ id: table.invApprovalAssigneeTable.id })
		.from(table.invApprovalAssigneeTable)
		.where(
			and(
				eq(table.invApprovalAssigneeTable.levelId, lvl.id),
				eq(table.invApprovalAssigneeTable.staffId, staffId)
			)
		)
		.limit(1);
	if (!asg) throw error(403, 'You are not an approver at this level');
}

/** Store + approval level pairs where this staff is a PR assignee (for list UI). */
export async function listPrApproverStoreLevelsForStaff(
	hospitalId: string,
	staffId: string
): Promise<{ storeId: number; level: number }[]> {
	return ensureDb()
		.select({
			storeId: table.invApprovalLevelTable.storeId,
			level: table.invApprovalLevelTable.level
		})
		.from(table.invApprovalLevelTable)
		.innerJoin(
			table.invApprovalAssigneeTable,
			eq(
				table.invApprovalAssigneeTable.levelId,
				table.invApprovalLevelTable.id
			)
		)
		.where(
			and(
				eq(table.invApprovalLevelTable.hospitalId, hospitalId),
				eq(table.invApprovalLevelTable.module, 'PR'),
				eq(table.invApprovalAssigneeTable.staffId, staffId),
				isNull(table.invApprovalLevelTable.deletedAt)
			)
		);
}

/** Store + approval level pairs where this staff is a PO assignee (for list UI). */
export async function listPoApproverStoreLevelsForStaff(
	hospitalId: string,
	staffId: string
): Promise<{ storeId: number; level: number }[]> {
	return ensureDb()
		.select({
			storeId: table.invApprovalLevelTable.storeId,
			level: table.invApprovalLevelTable.level
		})
		.from(table.invApprovalLevelTable)
		.innerJoin(
			table.invApprovalAssigneeTable,
			eq(
				table.invApprovalAssigneeTable.levelId,
				table.invApprovalLevelTable.id
			)
		)
		.where(
			and(
				eq(table.invApprovalLevelTable.hospitalId, hospitalId),
				eq(table.invApprovalLevelTable.module, 'PO'),
				eq(table.invApprovalAssigneeTable.staffId, staffId),
				isNull(table.invApprovalLevelTable.deletedAt)
			)
		);
}

/** Store + level pairs for department-indent approvers (from-store, module DI). */
export async function listDiApproverStoreLevelsForStaff(
	hospitalId: string,
	staffId: string
): Promise<{ storeId: number; level: number }[]> {
	return ensureDb()
		.select({
			storeId: table.invApprovalLevelTable.storeId,
			level: table.invApprovalLevelTable.level
		})
		.from(table.invApprovalLevelTable)
		.innerJoin(
			table.invApprovalAssigneeTable,
			eq(
				table.invApprovalAssigneeTable.levelId,
				table.invApprovalLevelTable.id
			)
		)
		.where(
			and(
				eq(table.invApprovalLevelTable.hospitalId, hospitalId),
				eq(table.invApprovalLevelTable.module, 'DI'),
				eq(table.invApprovalAssigneeTable.staffId, staffId),
				isNull(table.invApprovalLevelTable.deletedAt)
			)
		);
}

/** Store + level pairs for department-issue approvers (issuing store, module DISS). */
export async function listDissApproverStoreLevelsForStaff(
	hospitalId: string,
	staffId: string
): Promise<{ storeId: number; level: number }[]> {
	return ensureDb()
		.select({
			storeId: table.invApprovalLevelTable.storeId,
			level: table.invApprovalLevelTable.level
		})
		.from(table.invApprovalLevelTable)
		.innerJoin(
			table.invApprovalAssigneeTable,
			eq(
				table.invApprovalAssigneeTable.levelId,
				table.invApprovalLevelTable.id
			)
		)
		.where(
			and(
				eq(table.invApprovalLevelTable.hospitalId, hospitalId),
				eq(table.invApprovalLevelTable.module, 'DISS'),
				eq(table.invApprovalAssigneeTable.staffId, staffId),
				isNull(table.invApprovalLevelTable.deletedAt)
			)
		);
}

/** Store ids where staff is assigned for module (any level). */
export async function listAssignedStoreIdsForStaff(
	hospitalId: string,
	module: InvApprovalModule,
	staffId: string
): Promise<number[]> {
	const rows = await ensureDb()
		.select({ storeId: table.invApprovalLevelTable.storeId })
		.from(table.invApprovalAssigneeTable)
		.innerJoin(
			table.invApprovalLevelTable,
			eq(table.invApprovalAssigneeTable.levelId, table.invApprovalLevelTable.id)
		)
		.where(
			and(
				eq(table.invApprovalLevelTable.hospitalId, hospitalId),
				eq(table.invApprovalLevelTable.module, module),
				eq(table.invApprovalAssigneeTable.staffId, staffId),
				isNull(table.invApprovalLevelTable.deletedAt)
			)
		);
	return Array.from(new Set(rows.map((r) => r.storeId)));
}

/** Store + level pairs for department consumption approvers (consuming store, module DC). */
export async function listDcApproverStoreLevelsForStaff(
	hospitalId: string,
	staffId: string
): Promise<{ storeId: number; level: number }[]> {
	return ensureDb()
		.select({
			storeId: table.invApprovalLevelTable.storeId,
			level: table.invApprovalLevelTable.level
		})
		.from(table.invApprovalLevelTable)
		.innerJoin(
			table.invApprovalAssigneeTable,
			eq(
				table.invApprovalAssigneeTable.levelId,
				table.invApprovalLevelTable.id
			)
		)
		.where(
			and(
				eq(table.invApprovalLevelTable.hospitalId, hospitalId),
				eq(table.invApprovalLevelTable.module, 'DC'),
				eq(table.invApprovalAssigneeTable.staffId, staffId),
				isNull(table.invApprovalLevelTable.deletedAt)
			)
		);
}

export async function listApprovalLogs(
	hospitalId: string,
	documentId: string
) {
	const approverUser = alias(table.userTable, 'inv_log_approver');
	return ensureDb()
		.select({
			id: table.invApprovalLogTable.id,
			hospitalId: table.invApprovalLogTable.hospitalId,
			documentId: table.invApprovalLogTable.documentId,
			module: table.invApprovalLogTable.module,
			level: table.invApprovalLogTable.level,
			action: table.invApprovalLogTable.action,
			remarks: table.invApprovalLogTable.remarks,
			approvedBy: table.invApprovalLogTable.approvedBy,
			approvedByName: approverUser.name,
			lineAdjustments: table.invApprovalLogTable.lineAdjustments,
			createdAt: table.invApprovalLogTable.createdAt
		})
		.from(table.invApprovalLogTable)
		.leftJoin(
			approverUser,
			eq(table.invApprovalLogTable.approvedBy, approverUser.id)
		)
		.where(
			and(
				eq(table.invApprovalLogTable.hospitalId, hospitalId),
				eq(table.invApprovalLogTable.documentId, documentId)
			)
		)
		.orderBy(desc(table.invApprovalLogTable.createdAt));
}
