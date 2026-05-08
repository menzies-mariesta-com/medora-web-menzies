import { error, type RequestEvent } from '@sveltejs/kit';
import { and, asc, count, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	InvApprovalActionEnum,
	InvDepartmentIndentStatusTaggingEnum,
	InvDepartmentIssueStatusTaggingEnum
} from '$lib/model/enum/db-link';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { generatePrefix } from '$lib/server/heka/prefix/prefix-generator.server';
import { uuidv7 } from 'uuidv7';
import {
	assertStaffAssignedForModule,
	assertStaffCanApproveLevel,
	getMaxApprovalLevel,
	listAssignedStoreIdsForStaff,
	listDissApproverStoreLevelsForStaff
} from './approval-workflow.server';
import {
	assertStoreInHospital,
	ensureHospitalInventoryAccess,
	getStaffIdForUser
} from './inventory-scope.server';
import { resolveItemUnitMastersByItemAndPurchaseUnit } from '$lib/server/heka/administration/item-master.server';
import { addDeltaToInvStock } from './item-batch.server';
import { issueQtyStringFromPurchaseReceipt } from './item-unit-inventory.server';

export async function listDepartmentIssues(
	event: RequestEvent,
	input: {
		hospitalId: string;
		page?: number;
		pageSize?: number;
		fromStoreId?: number;
		toStoreId?: number;
		statusTaggingId?: number;
		/** Filter issues created from a department indent. */
		sourceIndentId?: string;
		issueNo?: string;
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const { page, pageSize, limit, offset } = normalizePagination(input);

	let cond = and(
		eq(table.invDepartmentIssueTable.hospitalId, input.hospitalId),
		isNull(table.invDepartmentIssueTable.deletedAt)
	);
	if (typeof input.fromStoreId === 'number') {
		cond = and(cond, eq(table.invDepartmentIssueTable.fromStoreId, input.fromStoreId))!;
	}
	if (typeof input.toStoreId === 'number') {
		cond = and(cond, eq(table.invDepartmentIssueTable.toStoreId, input.toStoreId))!;
	}
	if (typeof input.statusTaggingId === 'number') {
		cond = and(cond, eq(table.invDepartmentIssueTable.statusTaggingId, input.statusTaggingId))!;
	}
	if (input.sourceIndentId != null && input.sourceIndentId.trim() !== '') {
		cond = and(
			cond,
			eq(table.invDepartmentIssueTable.sourceIndentId, input.sourceIndentId.trim())
		)!;
	}
	const issueNoTerm = input.issueNo?.trim();
	if (issueNoTerm) {
		const safe = issueNoTerm.replace(/[%_\\]/g, '');
		if (safe) {
			cond = and(
				cond,
				ilike(table.invDepartmentIssueTable.issueNo, `%${safe}%`)
			)!;
		}
	}

	const fromSt = alias(table.storeTable, 'dept_issue_from_store');
	const toSt = alias(table.storeTable, 'dept_issue_to_store');
	const issueSt = alias(table.statusTaggingTable, 'dept_issue_list_status');
	const uCreated = alias(table.userTable, 'dept_issue_list_created_by');
	const uUpdated = alias(table.userTable, 'dept_issue_list_updated_by');
	const uRequested = alias(table.userTable, 'dept_issue_list_requested_by');
	const uApproved = alias(table.userTable, 'dept_issue_list_approved_by');
	const uCancelled = alias(table.userTable, 'dept_issue_list_cancelled_by');

	const [data, cnt] = await Promise.all([
		ensureDb()
			.select({
				issue: table.invDepartmentIssueTable,
				fromStoreName: fromSt.storeName,
				toStoreName: toSt.storeName,
				statusName: issueSt.name,
				/** Fallback: `requested_by` is always set on create; `created_by` may be null on legacy rows. */
				createdByName: sql<string>`coalesce(${uCreated.name}, ${uRequested.name})`,
				updatedByName: sql<string>`coalesce(${uUpdated.name}, ${uCreated.name}, ${uRequested.name})`,
				approvedByName: uApproved.name,
				cancelledByName: uCancelled.name
			})
			.from(table.invDepartmentIssueTable)
			.innerJoin(fromSt, eq(table.invDepartmentIssueTable.fromStoreId, fromSt.id))
			.innerJoin(toSt, eq(table.invDepartmentIssueTable.toStoreId, toSt.id))
			.innerJoin(
				issueSt,
				eq(table.invDepartmentIssueTable.statusTaggingId, issueSt.id)
			)
			.leftJoin(
				uRequested,
				eq(table.invDepartmentIssueTable.requestedBy, uRequested.id)
			)
			.leftJoin(uCreated, eq(table.invDepartmentIssueTable.createdBy, uCreated.id))
			.leftJoin(uUpdated, eq(table.invDepartmentIssueTable.updatedBy, uUpdated.id))
			.leftJoin(uApproved, eq(table.invDepartmentIssueTable.approvedBy, uApproved.id))
			.leftJoin(
				uCancelled,
				eq(table.invDepartmentIssueTable.cancelledBy, uCancelled.id)
			)
			.where(cond)
			.orderBy(desc(table.invDepartmentIssueTable.createdAt))
			.limit(limit)
			.offset(offset),
		ensureDb().select({ c: count() }).from(table.invDepartmentIssueTable).where(cond)
	]);

	const total = cnt[0]?.c ?? 0;

	const issueIds = data.map((r) => r.issue.id);
	const itemNamesByIssue = new Map<string, string>();
	if (issueIds.length > 0) {
		const nameRows = await ensureDb()
			.select({
				issueId: table.invDepartmentIssueLineTable.issueId,
				itemNames: sql<string>`string_agg(distinct ${table.itemMasterTable.itemName}, ', ')`
			})
			.from(table.invDepartmentIssueLineTable)
			.innerJoin(
				table.itemMasterTable,
				eq(table.invDepartmentIssueLineTable.itemId, table.itemMasterTable.id)
			)
			.where(
				and(
					inArray(table.invDepartmentIssueLineTable.issueId, issueIds),
					isNull(table.invDepartmentIssueLineTable.deletedAt)
				)
			)
			.groupBy(table.invDepartmentIssueLineTable.issueId);
		for (const r of nameRows) {
			if (r.issueId) itemNamesByIssue.set(r.issueId, r.itemNames ?? '');
		}
	}

	const userId = event.locals.user?.id ?? null;
	const staffId = userId ? await getStaffIdForUser(userId) : null;
	let approverPairSet = new Set<string>();
	let receiveStoreSet = new Set<number>();
	if (staffId) {
		const [pairs, rfsStores] = await Promise.all([
			listDissApproverStoreLevelsForStaff(input.hospitalId, staffId),
			listAssignedStoreIdsForStaff(input.hospitalId, 'RFS', staffId)
		]);
		approverPairSet = new Set(pairs.map((p) => `${p.storeId}:${p.level}`));
		receiveStoreSet = new Set(rfsStores);
	}

	return {
		data: data.map((r) => ({
			...r.issue,
			fromStoreName: r.fromStoreName,
			toStoreName: r.toStoreName,
			itemNames: itemNamesByIssue.get(r.issue.id) ?? '',
			statusName: r.statusName ?? null,
			createdByName: r.createdByName ?? null,
			updatedByName: r.updatedByName ?? null,
			approvedByName: r.approvedByName ?? null,
			cancelledByName: r.cancelledByName ?? null,
			canApprove:
				r.issue.statusTaggingId === InvDepartmentIssueStatusTaggingEnum.PENDING &&
				approverPairSet.has(`${r.issue.fromStoreId}:${r.issue.currentLevel}`),
			canReceive:
				r.issue.statusTaggingId === InvDepartmentIssueStatusTaggingEnum.ISSUED &&
				receiveStoreSet.has(r.issue.toStoreId)
		})),
		total,
		page,
		pageSize,
		totalPages: Math.ceil(Number(total) / pageSize) || 1
	};
}

export async function getDepartmentIssueById(
	event: RequestEvent,
	input: { hospitalId: string; id: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);

	const fromSt = alias(table.storeTable, 'dept_issue_detail_from');
	const toSt = alias(table.storeTable, 'dept_issue_detail_to');
	const srcIndent = alias(table.invDepartmentIndentTable, 'dept_issue_source_indent');
	const uReq = alias(table.userTable, 'dept_issue_req_user');
	const uAppr = alias(table.userTable, 'dept_issue_appr_user');
	const uIssued = alias(table.userTable, 'dept_issue_issued_user');
	const uReceived = alias(table.userTable, 'dept_issue_received_user');
	const uCancelled = alias(table.userTable, 'dept_issue_cancelled_user');

	const [joined] = await ensureDb()
		.select({
			issue: table.invDepartmentIssueTable,
			statusName: table.statusTaggingTable.name,
			statusCode: table.statusTaggingTable.code,
			fromStoreName: fromSt.storeName,
			toStoreName: toSt.storeName,
			sourceIndentNo: srcIndent.indentNo,
			requestedByName: uReq.name,
			approvedByName: uAppr.name,
			issuedByName: uIssued.name,
			receivedByName: uReceived.name,
			cancelledByName: uCancelled.name
		})
		.from(table.invDepartmentIssueTable)
		.innerJoin(
			table.statusTaggingTable,
			eq(table.invDepartmentIssueTable.statusTaggingId, table.statusTaggingTable.id)
		)
		.innerJoin(fromSt, eq(table.invDepartmentIssueTable.fromStoreId, fromSt.id))
		.innerJoin(toSt, eq(table.invDepartmentIssueTable.toStoreId, toSt.id))
		.leftJoin(srcIndent, eq(table.invDepartmentIssueTable.sourceIndentId, srcIndent.id))
		.leftJoin(uReq, eq(table.invDepartmentIssueTable.requestedBy, uReq.id))
		.leftJoin(uAppr, eq(table.invDepartmentIssueTable.approvedBy, uAppr.id))
		.leftJoin(uIssued, eq(table.invDepartmentIssueTable.issuedBy, uIssued.id))
		.leftJoin(uReceived, eq(table.invDepartmentIssueTable.receivedBy, uReceived.id))
		.leftJoin(uCancelled, eq(table.invDepartmentIssueTable.cancelledBy, uCancelled.id))
		.where(
			and(
				eq(table.invDepartmentIssueTable.id, input.id),
				eq(table.invDepartmentIssueTable.hospitalId, input.hospitalId),
				isNull(table.invDepartmentIssueTable.deletedAt)
			)
		)
		.limit(1);

	if (!joined) return null;

	const issueLineRows = await ensureDb()
		.select({
			line: table.invDepartmentIssueLineTable,
			itemName: table.itemMasterTable.itemName,
			unitName: table.unitTable.name
		})
		.from(table.invDepartmentIssueLineTable)
		.innerJoin(
			table.itemMasterTable,
			eq(table.invDepartmentIssueLineTable.itemId, table.itemMasterTable.id)
		)
		.innerJoin(
			table.unitTable,
			eq(table.invDepartmentIssueLineTable.unitId, table.unitTable.id)
		)
		.where(
			and(
				eq(table.invDepartmentIssueLineTable.issueId, input.id),
				isNull(table.invDepartmentIssueLineTable.deletedAt)
			)
		)
		.orderBy(asc(table.invDepartmentIssueLineTable.id));

	const iumMap = await resolveItemUnitMastersByItemAndPurchaseUnit(
		input.hospitalId,
		issueLineRows.map((r) => ({
			itemId: r.line.itemId,
			purchaseUnitId: r.line.unitId
		}))
	);
	const lineIdToItemUnit = new Map(
		issueLineRows.map((r) => [
			r.line.id,
			{ itemId: r.line.itemId, unitId: r.line.unitId }
		])
	);

	let allocations: Array<{
		lineId: number;
		itemId: number;
		itemName: string | null;
		batchId: number;
		batchNo: string | null;
		expiryDate: string | null;
		quantity: string;
		itemUnitMasterId: number | null;
		purchaseConversionFactor: string | null;
		issueConversionFactor: string | null;
		issueUnitName: string | null;
	}> = [];
	if (
		joined.issue.statusTaggingId === InvDepartmentIssueStatusTaggingEnum.ISSUED ||
		joined.issue.statusTaggingId === InvDepartmentIssueStatusTaggingEnum.RECEIVED
	) {
		const allocJoined = await ensureDb()
			.select({
				lineId: table.invDepartmentIssueLineAllocTable.lineId,
				itemId: table.invDepartmentIssueLineTable.itemId,
				itemName: table.itemMasterTable.itemName,
				batchId: table.invDepartmentIssueLineAllocTable.batchId,
				batchNo: table.itemBatchTable.batchNo,
				expiryDate: table.itemBatchTable.expiryDate,
				qty: table.invDepartmentIssueLineAllocTable.quantity
			})
			.from(table.invDepartmentIssueLineAllocTable)
			.innerJoin(
				table.invDepartmentIssueLineTable,
				eq(table.invDepartmentIssueLineAllocTable.lineId, table.invDepartmentIssueLineTable.id)
			)
			.innerJoin(
				table.itemMasterTable,
				eq(table.invDepartmentIssueLineTable.itemId, table.itemMasterTable.id)
			)
			.innerJoin(
				table.itemBatchTable,
				eq(table.invDepartmentIssueLineAllocTable.batchId, table.itemBatchTable.id)
			)
			.where(eq(table.invDepartmentIssueLineTable.issueId, input.id));

		allocations = allocJoined.map((a) => {
			const lu = lineIdToItemUnit.get(a.lineId);
			const k = lu ? `${lu.itemId}:${lu.unitId}` : '';
			const ium = k ? iumMap.get(k) : undefined;
			return {
				lineId: a.lineId,
				itemId: a.itemId,
				itemName: a.itemName,
				batchId: a.batchId,
				batchNo: a.batchNo,
				expiryDate: a.expiryDate,
				quantity: String(a.qty),
				itemUnitMasterId: ium?.id ?? null,
				purchaseConversionFactor: ium?.purchaseConversionFactor ?? null,
				issueConversionFactor: ium?.issueConversionFactor ?? null,
				issueUnitName: ium?.issueUnitName ?? null
			};
		});
	}

	const userId = event.locals.user?.id ?? null;
	let canApprove = false;
	if (userId && joined.issue.statusTaggingId === InvDepartmentIssueStatusTaggingEnum.PENDING) {
		const staffId = await getStaffIdForUser(userId);
		if (staffId) {
			const pairs = await listDissApproverStoreLevelsForStaff(input.hospitalId, staffId);
			const set = new Set(pairs.map((p: { storeId: number; level: number }) => `${p.storeId}:${p.level}`));
			canApprove = set.has(`${joined.issue.fromStoreId}:${joined.issue.currentLevel}`);
		}
	}

	const canReceive = joined.issue.statusTaggingId === InvDepartmentIssueStatusTaggingEnum.ISSUED;

	return {
		...joined.issue,
		statusName: joined.statusName,
		statusCode: joined.statusCode,
		fromStoreName: joined.fromStoreName,
		toStoreName: joined.toStoreName,
		sourceIndentNo: joined.sourceIndentNo ?? null,
		requestedByName: joined.requestedByName ?? null,
		approvedByName: joined.approvedByName ?? null,
		issuedByName: joined.issuedByName ?? null,
		receivedByName: joined.receivedByName ?? null,
		cancelledByName: joined.cancelledByName ?? null,
		canApprove,
		canReceive,
		lines: issueLineRows.map((r) => {
			const k = `${r.line.itemId}:${r.line.unitId}`;
			const ium = iumMap.get(k);
			return {
				...r.line,
				itemName: r.itemName,
				unitName: r.unitName,
				itemUnitMasterId: ium?.id ?? null,
				itemUnitMasterConversion: ium?.conversionDisplay ?? null,
				purchaseConversionFactor: ium?.purchaseConversionFactor ?? null,
				issueConversionFactor: ium?.issueConversionFactor ?? null,
				issueUnitName: ium?.issueUnitName ?? null
			};
		}),
		allocations
	};
}

export async function createDepartmentIssue(
	event: RequestEvent,
	input: {
		hospitalId: string;
		fromStoreId: number;
		toStoreId: number;
		remarks: string | null;
		lines: { itemId: number; quantity: string; unitId: number }[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	if (input.lines.length === 0) throw error(400, 'At least one line required');

	const fromS = await assertStoreInHospital(input.hospitalId, input.fromStoreId);
	const toS = await assertStoreInHospital(input.hospitalId, input.toStoreId);
	if (fromS.id === toS.id) throw error(400, 'From and to stores must differ');
	if (fromS.branchId !== toS.branchId) throw error(400, 'Stores must be in the same branch');
	const branchId = fromS.branchId;
	if (!branchId) throw error(400, 'Store is missing branch context');

	const today = new Date();
	const [financialYear] = await ensureDb()
		.select({ id: table.financialYearTable.id })
		.from(table.financialYearTable)
		.where(
			and(
				eq(table.financialYearTable.hospitalId, input.hospitalId),
				sql`${table.financialYearTable.startDate} <= ${today}`,
				sql`${table.financialYearTable.endDate} >= ${today}`,
				isNull(table.financialYearTable.deletedAt)
			)
		)
		.limit(1);
	if (!financialYear) throw error(400, 'Financial year is not configured for this hospital.');

	const issueNo = await generatePrefix({
		hospitalId: input.hospitalId,
		branchId,
		financialYearId: financialYear.id,
		prefixKey: PREFIX_PURPOSE_STORAGE.DEPARTMENT_ISSUE_NO,
		context: {}
	});

	const id = await ensureDb().transaction(async (tx) => {
		const newId = uuidv7();
		await tx.insert(table.invDepartmentIssueTable).values({
			id: newId,
			hospitalId: input.hospitalId,
			issueNo,
			sourceIndentId: null,
			fromStoreId: input.fromStoreId,
			toStoreId: input.toStoreId,
			requestedBy: userId,
			statusTaggingId: InvDepartmentIssueStatusTaggingEnum.PENDING,
			currentLevel: 1,
			remarks: input.remarks,
			createdBy: userId,
			updatedBy: userId
		});
		await tx.insert(table.invDepartmentIssueLineTable).values(
			input.lines.map((l) => ({
				issueId: newId,
				itemId: l.itemId,
				quantity: l.quantity,
				unitId: l.unitId,
				createdBy: userId,
				updatedBy: userId
			}))
		);
		return newId;
	});

	return getDepartmentIssueById(event, { hospitalId: input.hospitalId, id });
}

/**
 * Central store creates a Department Issue from an indent in `PENDING_CENTRAL`
 * (after the requesting store’s indent approvals are complete).
 */
export async function createDepartmentIssueFromIndent(
	event: RequestEvent,
	input: {
		hospitalId: string;
		indentId: string;
		/** Must match indent `to_store_id` (fulfilling / central store). */
		actingFromStoreId: number;
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');

	const [ind] = await ensureDb()
		.select()
		.from(table.invDepartmentIndentTable)
		.where(
			and(
				eq(table.invDepartmentIndentTable.id, input.indentId),
				eq(table.invDepartmentIndentTable.hospitalId, input.hospitalId),
				isNull(table.invDepartmentIndentTable.deletedAt)
			)
		)
		.limit(1);
	if (!ind) throw error(404, 'Indent not found');
	if (ind.statusTaggingId !== InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL) {
		throw error(400, 'Indent is not awaiting fulfillment at the central store');
	}
	if (ind.toStoreId !== input.actingFromStoreId) {
		throw error(
			403,
			'Select the central store (indent “to” store) in the top bar to create this issue'
		);
	}

	const [existing] = await ensureDb()
		.select({ id: table.invDepartmentIssueTable.id })
		.from(table.invDepartmentIssueTable)
		.where(
			and(
				eq(table.invDepartmentIssueTable.hospitalId, input.hospitalId),
				eq(table.invDepartmentIssueTable.sourceIndentId, input.indentId),
				isNull(table.invDepartmentIssueTable.deletedAt)
			)
		)
		.limit(1);
	if (existing) {
		return getDepartmentIssueById(event, {
			hospitalId: input.hospitalId,
			id: existing.id
		});
	}

	const [centralStore] = await ensureDb()
		.select({ branchId: table.storeTable.branchId })
		.from(table.storeTable)
		.where(eq(table.storeTable.id, ind.toStoreId))
		.limit(1);
	if (!centralStore?.branchId) {
		throw error(400, 'Store branch context missing');
	}

	const today = new Date();
	const [financialYear] = await ensureDb()
		.select({ id: table.financialYearTable.id })
		.from(table.financialYearTable)
		.where(
			and(
				eq(table.financialYearTable.hospitalId, input.hospitalId),
				sql`${table.financialYearTable.startDate} <= ${today}`,
				sql`${table.financialYearTable.endDate} >= ${today}`,
				isNull(table.financialYearTable.deletedAt)
			)
		)
		.limit(1);
	if (!financialYear) {
		throw error(400, 'Financial year is not configured for this hospital.');
	}

	let issueNo: string;
	try {
		issueNo = await generatePrefix({
			hospitalId: input.hospitalId,
			branchId: centralStore.branchId,
			financialYearId: financialYear.id,
			prefixKey: PREFIX_PURPOSE_STORAGE.DEPARTMENT_ISSUE_NO,
			context: {}
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		throw error(
			400,
			`Unable to generate Issue No (DEPARTMENT_ISSUE_NO). Configure it in Prefix Configuration. (${msg})`
		);
	}

	const newId = await ensureDb().transaction(async (tx) => {
		const issueId = uuidv7();
		await tx.insert(table.invDepartmentIssueTable).values({
			id: issueId,
			hospitalId: input.hospitalId,
			issueNo,
			sourceIndentId: ind.id,
			fromStoreId: ind.toStoreId,
			toStoreId: ind.fromStoreId,
			requestedBy: ind.requestedBy,
			statusTaggingId: InvDepartmentIssueStatusTaggingEnum.PENDING,
			currentLevel: 1,
			remarks: ind.remarks,
			createdBy: userId,
			updatedBy: userId
		});

		const indentLines = await tx
			.select({
				itemId: table.invDepartmentIndentLineTable.itemId,
				quantity: table.invDepartmentIndentLineTable.quantity,
				unitId: table.invDepartmentIndentLineTable.unitId
			})
			.from(table.invDepartmentIndentLineTable)
			.where(
				and(
					eq(table.invDepartmentIndentLineTable.indentId, ind.id),
					isNull(table.invDepartmentIndentLineTable.deletedAt)
				)
			);

		if (indentLines.length === 0) {
			throw error(400, 'Indent has no lines');
		}

		await tx.insert(table.invDepartmentIssueLineTable).values(
			indentLines.map((l) => ({
				issueId,
				itemId: l.itemId,
				quantity: String(l.quantity),
				unitId: l.unitId,
				createdBy: userId,
				updatedBy: userId
			}))
		);
		return issueId;
	});

	return getDepartmentIssueById(event, { hospitalId: input.hospitalId, id: newId });
}

export async function approveDepartmentIssue(
	event: RequestEvent,
	input: { hospitalId: string; issueId: string; action: number; remarks: string | null }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	const staffId = await getStaffIdForUser(userId);
	if (!staffId) throw error(403, 'Staff profile required to approve');

	const [iss] = await ensureDb()
		.select()
		.from(table.invDepartmentIssueTable)
		.where(
			and(
				eq(table.invDepartmentIssueTable.id, input.issueId),
				eq(table.invDepartmentIssueTable.hospitalId, input.hospitalId),
				isNull(table.invDepartmentIssueTable.deletedAt)
			)
		)
		.limit(1);
	if (!iss) throw error(404, 'Issue not found');
	if (iss.statusTaggingId !== InvDepartmentIssueStatusTaggingEnum.PENDING) {
		throw error(400, 'Issue is not awaiting approval');
	}

	const maxLevel = await getMaxApprovalLevel(input.hospitalId, iss.fromStoreId, 'DISS');
	if (maxLevel < 1) {
		throw error(400, 'Configure department-issue approvers (Inventory Setup → Approval) for this store');
	}
	await assertStaffCanApproveLevel(input.hospitalId, iss.fromStoreId, 'DISS', iss.currentLevel, staffId);

	const rejectReason =
		input.remarks != null && String(input.remarks).trim() !== ''
			? String(input.remarks).trim()
			: 'Rejected by approver';

	await ensureDb().transaction(async (tx) => {
		if (input.action === InvApprovalActionEnum.REJECTED) {
			await tx
				.update(table.invDepartmentIssueTable)
				.set({
					statusTaggingId: InvDepartmentIssueStatusTaggingEnum.CANCELLED,
					cancelledBy: userId,
					cancelledAt: sql<string>`now()`,
					cancelReason: rejectReason,
					updatedBy: userId
				})
				.where(eq(table.invDepartmentIssueTable.id, input.issueId));
			return;
		}

		if (input.action === InvApprovalActionEnum.APPROVED) {
			if (iss.currentLevel < maxLevel) {
				await tx
					.update(table.invDepartmentIssueTable)
					.set({
						currentLevel: iss.currentLevel + 1,
						updatedBy: userId
					})
					.where(eq(table.invDepartmentIssueTable.id, input.issueId));
				return;
			}

			// Final approval: issue stock (FEFO) and mark ISSUED.
			const lines = await tx
				.select()
				.from(table.invDepartmentIssueLineTable)
				.where(
					and(
						eq(table.invDepartmentIssueLineTable.issueId, input.issueId),
						isNull(table.invDepartmentIssueLineTable.deletedAt)
					)
				)
				.orderBy(asc(table.invDepartmentIssueLineTable.id));

			for (const line of lines) {
				const needIssue = await issueQtyStringFromPurchaseReceipt({
					hospitalId: input.hospitalId,
					itemId: line.itemId,
					purchaseUnitId: line.unitId,
					purchaseQtyStr: String(line.quantity)
				});
				let remaining = Number(needIssue);
				if (!Number.isFinite(remaining) || remaining <= 0) {
					throw error(400, 'Invalid line quantity');
				}

				const rows = await tx
					.select({
						stock: table.invStockTable,
						expiryDate: table.itemBatchTable.expiryDate
					})
					.from(table.invStockTable)
					.innerJoin(
						table.itemBatchTable,
						eq(table.invStockTable.batchId, table.itemBatchTable.id)
					)
					.where(
						and(
							eq(table.invStockTable.storeId, iss.fromStoreId),
							eq(table.invStockTable.itemId, line.itemId),
							isNull(table.invStockTable.deletedAt),
							sql`${table.invStockTable.quantity}::numeric > 0`
						)
					)
					.orderBy(
						sql`${table.itemBatchTable.expiryDate} ASC NULLS LAST`,
						asc(table.invStockTable.id)
					);

				for (const row of rows) {
					if (remaining <= 0) break;
					const avail = Number(row.stock.quantity);
					const take = Math.min(remaining, avail);
					if (take <= 0) continue;

					await addDeltaToInvStock(tx, {
						hospitalId: input.hospitalId,
						itemId: line.itemId,
						storeId: iss.fromStoreId,
						batchId: row.stock.batchId,
						delta: (-take).toFixed(6),
						userId
					});
					await tx.insert(table.invDepartmentIssueLineAllocTable).values({
						lineId: line.id,
						batchId: row.stock.batchId,
						quantity: take.toFixed(6)
					});
					remaining -= take;
				}

				if (remaining > 1e-6) throw error(400, 'Insufficient stock at fulfilling store');

				await tx
					.update(table.invDepartmentIssueLineTable)
					.set({ qtyIssued: needIssue, updatedBy: userId })
					.where(eq(table.invDepartmentIssueLineTable.id, line.id));
			}

			await tx
				.update(table.invDepartmentIssueTable)
				.set({
					statusTaggingId: InvDepartmentIssueStatusTaggingEnum.ISSUED,
					approvedBy: userId,
					approvedAt: sql<string>`now()`,
					issuedBy: userId,
					issuedAt: sql<string>`now()`,
					updatedBy: userId
				})
				.where(eq(table.invDepartmentIssueTable.id, input.issueId));

			if (iss.sourceIndentId) {
				const sid = iss.sourceIndentId;
				const doneLines = await tx
					.select({
						itemId: table.invDepartmentIssueLineTable.itemId,
						unitId: table.invDepartmentIssueLineTable.unitId,
						qtyIssued: table.invDepartmentIssueLineTable.qtyIssued
					})
					.from(table.invDepartmentIssueLineTable)
					.where(
						and(
							eq(table.invDepartmentIssueLineTable.issueId, input.issueId),
							isNull(table.invDepartmentIssueLineTable.deletedAt)
						)
					);
				for (const dl of doneLines) {
					await tx
						.update(table.invDepartmentIndentLineTable)
						.set({
							qtyIssued: String(dl.qtyIssued),
							updatedBy: userId
						})
						.where(
							and(
								eq(table.invDepartmentIndentLineTable.indentId, sid),
								eq(table.invDepartmentIndentLineTable.itemId, dl.itemId),
								eq(table.invDepartmentIndentLineTable.unitId, dl.unitId),
								isNull(table.invDepartmentIndentLineTable.deletedAt)
							)
						);
				}
				await tx
					.update(table.invDepartmentIndentTable)
					.set({
						statusTaggingId: InvDepartmentIndentStatusTaggingEnum.ISSUED,
						issuedBy: userId,
						issuedAt: sql<string>`now()`,
						updatedBy: userId
					})
					.where(eq(table.invDepartmentIndentTable.id, sid));
			}
		}
	});

	return getDepartmentIssueById(event, { hospitalId: input.hospitalId, id: input.issueId });
}

export async function postDepartmentIssueReceive(
	event: RequestEvent,
	input: { hospitalId: string; issueId: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	const staffId = await getStaffIdForUser(userId);
	if (!staffId) throw error(403, 'Staff profile required to receive');

	const detail = await getDepartmentIssueById(event, {
		hospitalId: input.hospitalId,
		id: input.issueId
	});
	if (!detail) throw error(404, 'Issue not found');
	if (detail.statusTaggingId !== InvDepartmentIssueStatusTaggingEnum.ISSUED) {
		throw error(400, 'Issue is not issued or already received');
	}

	await assertStaffAssignedForModule(input.hospitalId, detail.toStoreId, 'RFS', staffId);

	const allocRows = await ensureDb()
		.select({
			alloc: table.invDepartmentIssueLineAllocTable,
			line: table.invDepartmentIssueLineTable
		})
		.from(table.invDepartmentIssueLineAllocTable)
		.innerJoin(
			table.invDepartmentIssueLineTable,
			eq(table.invDepartmentIssueLineAllocTable.lineId, table.invDepartmentIssueLineTable.id)
		)
		.where(eq(table.invDepartmentIssueLineTable.issueId, input.issueId));
	if (allocRows.length === 0) throw error(400, 'No allocations to receive');

	const sourceIndentId = detail.sourceIndentId ?? null;

	await ensureDb().transaction(async (tx) => {
		for (const { alloc, line } of allocRows) {
			await addDeltaToInvStock(tx, {
				hospitalId: input.hospitalId,
				itemId: line.itemId,
				storeId: detail.toStoreId,
				batchId: alloc.batchId,
				delta: String(alloc.quantity),
				userId
			});
		}
		await tx
			.update(table.invDepartmentIssueTable)
			.set({
				statusTaggingId: InvDepartmentIssueStatusTaggingEnum.RECEIVED,
				receivedBy: userId,
				receivedAt: sql<string>`now()`,
				updatedBy: userId
			})
			.where(eq(table.invDepartmentIssueTable.id, input.issueId));

		if (sourceIndentId) {
			await tx
				.update(table.invDepartmentIndentTable)
				.set({
					statusTaggingId: InvDepartmentIndentStatusTaggingEnum.RECEIVED,
					receivedBy: userId,
					receivedAt: sql<string>`now()`,
					updatedBy: userId
				})
				.where(eq(table.invDepartmentIndentTable.id, sourceIndentId));
		}
	});

	return getDepartmentIssueById(event, { hospitalId: input.hospitalId, id: input.issueId });
}

export async function cancelDepartmentIssue(
	event: RequestEvent,
	input: { hospitalId: string; issueId: string; reason: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	const reason = input.reason.trim();
	if (!reason) throw error(400, 'Cancel reason is required');

	const [iss] = await ensureDb()
		.select()
		.from(table.invDepartmentIssueTable)
		.where(
			and(
				eq(table.invDepartmentIssueTable.id, input.issueId),
				eq(table.invDepartmentIssueTable.hospitalId, input.hospitalId),
				isNull(table.invDepartmentIssueTable.deletedAt)
			)
		)
		.limit(1);
	if (!iss) throw error(404, 'Issue not found');
	if (iss.statusTaggingId === InvDepartmentIssueStatusTaggingEnum.CANCELLED) {
		throw error(400, 'Issue is already cancelled');
	}
	if (iss.statusTaggingId !== InvDepartmentIssueStatusTaggingEnum.PENDING) {
		throw error(400, 'Issue cannot be cancelled in current status');
	}

	let allowed = iss.requestedBy === userId;
	if (!allowed) {
		const staffId = await getStaffIdForUser(userId);
		if (staffId) {
			try {
				await assertStaffAssignedForModule(input.hospitalId, iss.fromStoreId, 'DISS', staffId);
				allowed = true;
			} catch {
				allowed = false;
			}
		}
	}
	if (!allowed) throw error(403, 'You cannot cancel this issue');

	await ensureDb()
		.update(table.invDepartmentIssueTable)
		.set({
			statusTaggingId: InvDepartmentIssueStatusTaggingEnum.CANCELLED,
			cancelledBy: userId,
			cancelledAt: sql<string>`now()`,
			cancelReason: reason,
			updatedBy: userId
		})
		.where(eq(table.invDepartmentIssueTable.id, input.issueId));

	return getDepartmentIssueById(event, { hospitalId: input.hospitalId, id: input.issueId });
}

