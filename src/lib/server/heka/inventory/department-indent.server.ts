import { error, type RequestEvent } from '@sveltejs/kit';
import { and, asc, count, desc, eq, ilike, inArray, isNull, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	InvApprovalActionEnum,
	InvDepartmentIndentStatusTaggingEnum,
	InvDepartmentIssueStatusTaggingEnum
} from '$lib/model/enum/db-link';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { generatePrefix } from '$lib/server/heka/prefix/prefix-generator.server';
import { uuidv7 } from 'uuidv7';
import {
	assertStaffAssignedForModule,
	assertStaffCanApproveLevel,
	getMaxApprovalLevel,
	listDiApproverStoreLevelsForStaff
} from './approval-workflow.server';
import {
	assertStoreInHospital,
	ensureHospitalInventoryAccess,
	getStaffIdForUser
} from './inventory-scope.server';
import { addDeltaToInvStock } from './item-batch.server';
import { issueQtyStringFromPurchaseReceipt } from './item-unit-inventory.server';
import { parsePositiveIntQty } from './inv-validate.server';
import { resolveItemUnitMastersByItemAndPurchaseUnit } from '$lib/server/heka/administration/item-master.server';

async function checkUserCanCancelDepartmentIndent(
	hospitalId: string,
	indent: Pick<
		typeof table.invDepartmentIndentTable.$inferSelect,
		'requestedBy' | 'statusTaggingId'
	>,
	userId: string
): Promise<boolean> {
	const st = indent.statusTaggingId;
	// Requester may withdraw while awaiting store approval, or while at central
	// before a department issue document exists (see cancelDepartmentIndent).
	if (st === InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL) {
		return indent.requestedBy === userId;
	}
	if (st !== InvDepartmentIndentStatusTaggingEnum.PENDING) return false;
	return indent.requestedBy === userId;
}

export async function listDepartmentIndents(
	event: RequestEvent,
	input: {
		hospitalId: string;
		page?: number;
		pageSize?: number;
		fromStoreId?: number;
		toStoreId?: number;
		statusTaggingId?: number;
		indentNo?: string;
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const { page, pageSize, limit, offset } =
		normalizePagination(input);
	let cond = and(
		eq(table.invDepartmentIndentTable.hospitalId, input.hospitalId),
		isNull(table.invDepartmentIndentTable.deletedAt)
	);
	if (typeof input.fromStoreId === 'number') {
		cond = and(
			cond,
			eq(
				table.invDepartmentIndentTable.fromStoreId,
				input.fromStoreId
			)
		)!;
	}
	if (typeof input.toStoreId === 'number') {
		cond = and(
			cond,
			eq(table.invDepartmentIndentTable.toStoreId, input.toStoreId)
		)!;
	}
	if (typeof input.statusTaggingId === 'number') {
		cond = and(
			cond,
			eq(
				table.invDepartmentIndentTable.statusTaggingId,
				input.statusTaggingId
			)
		)!;
	}
	const indentNoTerm = input.indentNo?.trim();
	if (indentNoTerm) {
		const safe = indentNoTerm.replace(/[%_\\]/g, '');
		if (safe) {
			cond = and(
				cond,
				ilike(table.invDepartmentIndentTable.indentNo, `%${safe}%`)
			)!;
		}
	}
	const fromSt = alias(table.storeTable, 'dept_indent_from_store');
	const toSt = alias(table.storeTable, 'dept_indent_to_store');
	const uCreated = alias(table.userTable, 'di_list_created_by');
	const uUpdated = alias(table.userTable, 'di_list_updated_by');
	const uRequested = alias(table.userTable, 'di_list_requested_by');
	const uFromApproved = alias(table.userTable, 'di_list_from_approved_by');
	const uCancelled = alias(table.userTable, 'di_list_cancelled_by');
	const [data, cnt] = await Promise.all([
		ensureDb()
			.select({
				row: table.invDepartmentIndentTable,
				fromStoreName: fromSt.storeName,
				toStoreName: toSt.storeName,
				/** Fallback: `requested_by` is always set on create; `created_by` may be null on legacy rows. */
				createdByName: sql<string>`coalesce(${uCreated.name}, ${uRequested.name})`,
				updatedByName: sql<string>`coalesce(${uUpdated.name}, ${uCreated.name}, ${uRequested.name})`,
				approvedByName: uFromApproved.name,
				cancelledByName: uCancelled.name
			})
			.from(table.invDepartmentIndentTable)
			.innerJoin(
				fromSt,
				eq(table.invDepartmentIndentTable.fromStoreId, fromSt.id)
			)
			.innerJoin(
				toSt,
				eq(table.invDepartmentIndentTable.toStoreId, toSt.id)
			)
			.leftJoin(
				uRequested,
				eq(table.invDepartmentIndentTable.requestedBy, uRequested.id)
			)
			.leftJoin(
				uCreated,
				eq(table.invDepartmentIndentTable.createdBy, uCreated.id)
			)
			.leftJoin(
				uUpdated,
				eq(table.invDepartmentIndentTable.updatedBy, uUpdated.id)
			)
			.leftJoin(
				uFromApproved,
				eq(table.invDepartmentIndentTable.fromApprovedBy, uFromApproved.id)
			)
			.leftJoin(
				uCancelled,
				eq(table.invDepartmentIndentTable.cancelledBy, uCancelled.id)
			)
			.where(cond)
			.orderBy(desc(table.invDepartmentIndentTable.createdAt))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ c: count() })
			.from(table.invDepartmentIndentTable)
			.where(cond)
	]);
	const total = cnt[0]?.c ?? 0;

	const indentIds = data.map((r) => r.row.id);
	const itemNamesByIndent = new Map<string, string>();
	if (indentIds.length > 0) {
		const rows = await ensureDb()
			.select({
				indentId: table.invDepartmentIndentLineTable.indentId,
				itemNames: sql<string>`string_agg(distinct ${table.itemMasterTable.itemName}, ', ')`
			})
			.from(table.invDepartmentIndentLineTable)
			.innerJoin(
				table.itemMasterTable,
				eq(
					table.invDepartmentIndentLineTable.itemId,
					table.itemMasterTable.id
				)
			)
			.where(inArray(table.invDepartmentIndentLineTable.indentId, indentIds))
			.groupBy(table.invDepartmentIndentLineTable.indentId);
		for (const r of rows) {
			if (r.indentId) itemNamesByIndent.set(r.indentId, r.itemNames ?? '');
		}
	}
	const userId = event.locals.user?.id ?? null;
	let canApprovePairSet: Set<string> | null = null;
	if (userId) {
		const staffIdForApprove = await getStaffIdForUser(userId);
		if (staffIdForApprove) {
			const pairs = await listDiApproverStoreLevelsForStaff(
				input.hospitalId,
				staffIdForApprove
			);
			canApprovePairSet = new Set(
				pairs.map((p) => `${p.storeId}:${p.level}`)
			);
		}
	}
	const dataOut: Array<
		typeof table.invDepartmentIndentTable.$inferSelect & {
			fromStoreName: string | null;
			toStoreName: string | null;
			itemNames: string;
			canCancel: boolean;
			canApprove: boolean;
			createdByName: string | null;
			updatedByName: string | null;
			approvedByName: string | null;
			/** Mirrors `fromApprovedAt` for shared audit tooltip shape. */
			approvedAt: string | null;
			cancelledByName: string | null;
		}
	> = [];
	for (const r of data) {
		let canCancel = false;
		let canApprove = false;
		if (userId) {
			canCancel = await checkUserCanCancelDepartmentIndent(
				input.hospitalId,
				r.row,
				userId
			);
		}
		if (
			canApprovePairSet &&
			r.row.statusTaggingId === InvDepartmentIndentStatusTaggingEnum.PENDING
		) {
			// From-store approvals use fromStoreId + currentLevel.
			canApprove = canApprovePairSet.has(
				`${r.row.fromStoreId}:${r.row.currentLevel}`
			);
		}
		dataOut.push({
			...r.row,
			fromStoreName: r.fromStoreName,
			toStoreName: r.toStoreName,
			itemNames: itemNamesByIndent.get(r.row.id) ?? '',
			canCancel,
			canApprove,
			createdByName: r.createdByName ?? null,
			updatedByName: r.updatedByName ?? null,
			approvedByName: r.approvedByName ?? null,
			approvedAt: r.row.fromApprovedAt ?? null,
			cancelledByName: r.cancelledByName ?? null
		});
	}
	return {
		data: dataOut,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(Number(total) / pageSize) || 1
	};
}

export async function getDepartmentIndentById(
	event: RequestEvent,
	input: { hospitalId: string; id: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);

	const fromSt = alias(table.storeTable, 'dept_indent_detail_from');
	const toSt = alias(table.storeTable, 'dept_indent_detail_to');
	const uReq = alias(table.userTable, 'di_req_user');
	const uCreated = alias(table.userTable, 'di_detail_created_by');
	const uUpdated = alias(table.userTable, 'di_detail_updated_by');
	const uFromAppr = alias(table.userTable, 'di_from_appr_user');
	const uIssued = alias(table.userTable, 'di_issued_user');
	const uReceived = alias(table.userTable, 'di_received_user');
	const uCancelled = alias(table.userTable, 'di_cancelled_user');

	const [joined] = await ensureDb()
		.select({
			indent: table.invDepartmentIndentTable,
			statusName: table.statusTaggingTable.name,
			statusCode: table.statusTaggingTable.code,
			fromStoreName: fromSt.storeName,
			toStoreName: toSt.storeName,
			requestedByName: uReq.name,
			createdByName: sql<string>`coalesce(${uCreated.name}, ${uReq.name})`,
			updatedByName: sql<string>`coalesce(${uUpdated.name}, ${uCreated.name}, ${uReq.name})`,
			fromApprovedByName: uFromAppr.name,
			issuedByName: uIssued.name,
			receivedByName: uReceived.name,
			cancelledByName: uCancelled.name
		})
		.from(table.invDepartmentIndentTable)
		.innerJoin(
			table.statusTaggingTable,
			eq(
				table.invDepartmentIndentTable.statusTaggingId,
				table.statusTaggingTable.id
			)
		)
		.innerJoin(
			fromSt,
			eq(table.invDepartmentIndentTable.fromStoreId, fromSt.id)
		)
		.innerJoin(
			toSt,
			eq(table.invDepartmentIndentTable.toStoreId, toSt.id)
		)
		.leftJoin(
			uReq,
			eq(table.invDepartmentIndentTable.requestedBy, uReq.id)
		)
		.leftJoin(
			uCreated,
			eq(table.invDepartmentIndentTable.createdBy, uCreated.id)
		)
		.leftJoin(
			uUpdated,
			eq(table.invDepartmentIndentTable.updatedBy, uUpdated.id)
		)
		.leftJoin(
			uFromAppr,
			eq(table.invDepartmentIndentTable.fromApprovedBy, uFromAppr.id)
		)
		.leftJoin(
			uIssued,
			eq(table.invDepartmentIndentTable.issuedBy, uIssued.id)
		)
		.leftJoin(
			uReceived,
			eq(table.invDepartmentIndentTable.receivedBy, uReceived.id)
		)
		.leftJoin(
			uCancelled,
			eq(table.invDepartmentIndentTable.cancelledBy, uCancelled.id)
		)
		.where(
			and(
				eq(table.invDepartmentIndentTable.id, input.id),
				eq(
					table.invDepartmentIndentTable.hospitalId,
					input.hospitalId
				),
				isNull(table.invDepartmentIndentTable.deletedAt)
			)
		)
		.limit(1);

	if (!joined) return null;

	const lineRows = await ensureDb()
		.select({
			line: table.invDepartmentIndentLineTable,
			itemName: table.itemMasterTable.itemName,
			unitName: table.unitTable.name
		})
		.from(table.invDepartmentIndentLineTable)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.invDepartmentIndentLineTable.itemId,
				table.itemMasterTable.id
			)
		)
		.innerJoin(
			table.unitTable,
			eq(
				table.invDepartmentIndentLineTable.unitId,
				table.unitTable.id
			)
		)
		.where(
			and(
				eq(table.invDepartmentIndentLineTable.indentId, input.id),
				isNull(table.invDepartmentIndentLineTable.deletedAt)
			)
		);

	const iumMap = await resolveItemUnitMastersByItemAndPurchaseUnit(
		input.hospitalId,
		lineRows.map((r) => ({
			itemId: r.line.itemId,
			purchaseUnitId: r.line.unitId
		}))
	);
	const lineIdToItemUnit = new Map(
		lineRows.map((r) => [
			r.line.id,
			{ itemId: r.line.itemId, unitId: r.line.unitId }
		])
	);

	let allocations: {
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
	}[] = [];

	if (
		joined.indent.statusTaggingId ===
			InvDepartmentIndentStatusTaggingEnum.ISSUED ||
		joined.indent.statusTaggingId ===
			InvDepartmentIndentStatusTaggingEnum.RECEIVED
	) {
		const allocJoined = await ensureDb()
			.select({
				lineId: table.invDepartmentIndentLineAllocTable.lineId,
				itemId: table.invDepartmentIndentLineTable.itemId,
				itemName: table.itemMasterTable.itemName,
				batchId: table.invDepartmentIndentLineAllocTable.batchId,
				batchNo: table.itemBatchTable.batchNo,
				expiryDate: table.itemBatchTable.expiryDate,
				qty: table.invDepartmentIndentLineAllocTable.quantity
			})
			.from(table.invDepartmentIndentLineAllocTable)
			.innerJoin(
				table.invDepartmentIndentLineTable,
				eq(
					table.invDepartmentIndentLineAllocTable.lineId,
					table.invDepartmentIndentLineTable.id
				)
			)
			.innerJoin(
				table.itemMasterTable,
				eq(
					table.invDepartmentIndentLineTable.itemId,
					table.itemMasterTable.id
				)
			)
			.innerJoin(
				table.itemBatchTable,
				eq(
					table.invDepartmentIndentLineAllocTable.batchId,
					table.itemBatchTable.id
				)
			)
			.where(
				eq(table.invDepartmentIndentLineTable.indentId, input.id)
			);

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
	const staffIdForApprove = userId
		? await getStaffIdForUser(userId)
		: null;

	let canApprove = false;
	if (
		staffIdForApprove &&
		joined.indent.statusTaggingId ===
			InvDepartmentIndentStatusTaggingEnum.PENDING
	) {
		const pairs = await listDiApproverStoreLevelsForStaff(
			input.hospitalId,
			staffIdForApprove
		);
		const approverPairSet = new Set(
			pairs.map((p) => `${p.storeId}:${p.level}`)
		);
		canApprove = approverPairSet.has(
			`${joined.indent.fromStoreId}:${joined.indent.currentLevel}`
		);
	}

	let canCancel = false;
	if (userId) {
		canCancel = await checkUserCanCancelDepartmentIndent(
			input.hospitalId,
			joined.indent,
			userId
		);
	}

	// Department issue is now a separate document/table.
	const canIssue = false;
	const canReceive = false;

	return {
		...joined.indent,
		statusName: joined.statusName,
		statusCode: joined.statusCode,
		fromStoreName: joined.fromStoreName,
		toStoreName: joined.toStoreName,
		requestedByName: joined.requestedByName ?? null,
		createdByName: joined.createdByName ?? null,
		updatedByName: joined.updatedByName ?? null,
		fromApprovedByName: joined.fromApprovedByName ?? null,
		issuedByName: joined.issuedByName ?? null,
		receivedByName: joined.receivedByName ?? null,
		cancelledByName: joined.cancelledByName ?? null,
		canApprove,
		canCancel,
		canIssue,
		canReceive,
		lines: lineRows.map((r) => {
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

export async function createDepartmentIndent(
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
	if (input.lines.length === 0)
		throw error(400, 'At least one line required');

	const fromS = await assertStoreInHospital(
		input.hospitalId,
		input.fromStoreId
	);
	const toS = await assertStoreInHospital(
		input.hospitalId,
		input.toStoreId
	);
	if (fromS.id === toS.id) {
		throw error(400, 'From and to stores must differ');
	}

	const [prefixRow] = await ensureDb()
		.select({ id: table.prefixFormatTable.id })
		.from(table.prefixFormatTable)
		.where(
			and(
				eq(table.prefixFormatTable.hospitalId, input.hospitalId),
				eq(
					table.prefixFormatTable.key,
					PREFIX_PURPOSE_STORAGE.DEPARTMENT_INDENT_NO
				),
				isNull(table.prefixFormatTable.deletedAt)
			)
		)
		.limit(1);
	if (!prefixRow) {
		throw error(
			400,
			'Unable to generate Indent No (DEPARTMENT_INDENT_NO). Configure it in Prefix Configuration.'
		);
	}

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
	if (!financialYear) {
		throw error(
			400,
			'Financial year is not configured for this hospital.'
		);
	}

	let indentNo: string;
	try {
		indentNo = await generatePrefix({
			hospitalId: input.hospitalId,
			branchId,
			financialYearId: financialYear.id,
			prefixKey: PREFIX_PURPOSE_STORAGE.DEPARTMENT_INDENT_NO,
			context: {}
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		throw error(
			400,
			`Unable to generate Indent No (DEPARTMENT_INDENT_NO). Configure it in Prefix Configuration. (${msg})`
		);
	}

	const id = await ensureDb().transaction(async (tx) => {
		const newId = uuidv7();
		await tx.insert(table.invDepartmentIndentTable).values({
			id: newId,
			hospitalId: input.hospitalId,
			indentNo,
			fromStoreId: input.fromStoreId,
			toStoreId: input.toStoreId,
			requestedBy: userId,
			statusTaggingId: InvDepartmentIndentStatusTaggingEnum.PENDING,
			currentLevel: 1,
			remarks: input.remarks,
			createdBy: userId,
			updatedBy: userId
		});
		await tx.insert(table.invDepartmentIndentLineTable).values(
			input.lines.map((l) => ({
				indentId: newId,
				itemId: l.itemId,
				quantity: l.quantity,
				unitId: l.unitId,
				createdBy: userId,
				updatedBy: userId
			}))
		);
		return newId;
	});
	return getDepartmentIndentById(event, {
		hospitalId: input.hospitalId,
		id
	});
}

export async function approveDepartmentIndent(
	event: RequestEvent,
	input: {
		hospitalId: string;
		indentId: string;
		action: number;
		remarks: string | null;
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	const staffId = await getStaffIdForUser(userId);
	if (!staffId) throw error(403, 'Staff profile required to approve');

	const [ind] = await ensureDb()
		.select()
		.from(table.invDepartmentIndentTable)
		.where(
			and(
				eq(table.invDepartmentIndentTable.id, input.indentId),
				eq(
					table.invDepartmentIndentTable.hospitalId,
					input.hospitalId
				),
				isNull(table.invDepartmentIndentTable.deletedAt)
			)
		)
		.limit(1);
	if (!ind) throw error(404, 'Indent not found');
	if (ind.statusTaggingId !== InvDepartmentIndentStatusTaggingEnum.PENDING) {
		throw error(400, 'Indent is not awaiting approval');
	}

	const approvalStoreId = ind.fromStoreId;
	const maxLevel = await getMaxApprovalLevel(
		input.hospitalId,
		approvalStoreId,
		'DI'
	);
	if (maxLevel < 1) {
		throw error(
			400,
			'Configure department-indent approvers (Inventory Setup → Approval) for this store'
		);
	}
	await assertStaffCanApproveLevel(
		input.hospitalId,
		approvalStoreId,
		'DI',
		ind.currentLevel,
		staffId
	);

	const rejectReason =
		input.remarks != null && String(input.remarks).trim() !== ''
			? String(input.remarks).trim()
			: 'Rejected by approver';

	await ensureDb().transaction(async (tx) => {
		if (input.action === InvApprovalActionEnum.REJECTED) {
			await tx
				.update(table.invDepartmentIndentTable)
				.set({
					statusTaggingId:
						InvDepartmentIndentStatusTaggingEnum.CANCELLED,
					cancelledBy: userId,
					cancelledAt: sql<string>`now()`,
					cancelReason: rejectReason,
					updatedBy: userId
				})
				.where(eq(table.invDepartmentIndentTable.id, input.indentId));
		} else if (input.action === InvApprovalActionEnum.APPROVED) {
			if (ind.currentLevel < maxLevel) {
				await tx
					.update(table.invDepartmentIndentTable)
					.set({
						currentLevel: ind.currentLevel + 1,
						updatedBy: userId
					})
					.where(
						eq(table.invDepartmentIndentTable.id, input.indentId)
					);
			} else {
				// Final from-store approval only: `from_approved_by/at` stay null while
				// intermediate levels approve (current_level increments).
				// Central fulfillment queue — DISS creates the department issue.
				await tx
					.update(table.invDepartmentIndentTable)
					.set({
						statusTaggingId:
							InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL,
						currentLevel: 1,
						fromApprovedBy: userId,
						fromApprovedAt: sql<string>`now()`,
						updatedBy: userId
					})
					.where(eq(table.invDepartmentIndentTable.id, input.indentId));
			}
		}
	});

	return getDepartmentIndentById(event, {
		hospitalId: input.hospitalId,
		id: input.indentId
	});
}

export async function cancelDepartmentIndent(
	event: RequestEvent,
	input: { hospitalId: string; indentId: string; reason: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');

	const reason = input.reason.trim();
	if (!reason) throw error(400, 'Cancel reason is required');

	const [ind] = await ensureDb()
		.select()
		.from(table.invDepartmentIndentTable)
		.where(
			and(
				eq(table.invDepartmentIndentTable.id, input.indentId),
				eq(
					table.invDepartmentIndentTable.hospitalId,
					input.hospitalId
				),
				isNull(table.invDepartmentIndentTable.deletedAt)
			)
		)
		.limit(1);
	if (!ind) throw error(404, 'Indent not found');
	if (
		ind.statusTaggingId ===
		InvDepartmentIndentStatusTaggingEnum.CANCELLED
	) {
		throw error(400, 'Indent is already cancelled');
	}
	if (
		ind.statusTaggingId !==
			InvDepartmentIndentStatusTaggingEnum.PENDING &&
		ind.statusTaggingId !==
			InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL
	) {
		throw error(400, 'Indent cannot be cancelled in current status');
	}

	if (ind.statusTaggingId === InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL) {
		const [openIssue] = await ensureDb()
			.select({ id: table.invDepartmentIssueTable.id })
			.from(table.invDepartmentIssueTable)
			.where(
				and(
					eq(table.invDepartmentIssueTable.sourceIndentId, ind.id),
					isNull(table.invDepartmentIssueTable.deletedAt),
					ne(
						table.invDepartmentIssueTable.statusTaggingId,
						InvDepartmentIssueStatusTaggingEnum.CANCELLED
					)
				)
			)
			.limit(1);
		if (openIssue) {
			throw error(
				400,
				'A department issue exists for this indent. Cancel that issue first.'
			);
		}
	}

	const allowed = await checkUserCanCancelDepartmentIndent(
		input.hospitalId,
		ind,
		userId
	);
	if (!allowed) {
		throw error(403, 'You cannot cancel this indent');
	}

	await ensureDb()
		.update(table.invDepartmentIndentTable)
		.set({
			statusTaggingId: InvDepartmentIndentStatusTaggingEnum.CANCELLED,
			cancelledBy: userId,
			cancelledAt: sql<string>`now()`,
			cancelReason: reason,
			updatedBy: userId
		})
		.where(eq(table.invDepartmentIndentTable.id, input.indentId));

	return getDepartmentIndentById(event, {
		hospitalId: input.hospitalId,
		id: input.indentId
	});
}

/**
 * Deduct from the fulfilling `toStore` (FEFO) and mark indent issued.
 */
export async function postDepartmentIndentIssue(
	event: RequestEvent,
	input: { hospitalId: string; indentId: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');

	const detail = await getDepartmentIndentById(event, {
		hospitalId: input.hospitalId,
		id: input.indentId
	});
	if (!detail) throw error(404, 'Indent not found');
	if (
		detail.statusTaggingId !==
		InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL
	) {
		throw error(
			400,
			'Indent is not ready for issue at the fulfilling store'
		);
	}

	const centralStoreId = detail.toStoreId;

	await ensureDb().transaction(async (tx) => {
		for (const line of detail.lines) {
			const needIssue = await issueQtyStringFromPurchaseReceipt({
				hospitalId: input.hospitalId,
				itemId: line.itemId,
				purchaseUnitId: line.unitId,
				purchaseQtyStr: String(line.quantity)
			});
			let remaining = parsePositiveIntQty(needIssue, 'quantity');

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
						eq(table.invStockTable.storeId, centralStoreId),
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
					storeId: centralStoreId,
					batchId: row.stock.batchId,
					delta: String(-take),
					userId
				});
				await tx
					.insert(table.invDepartmentIndentLineAllocTable)
					.values({
						lineId: line.id,
						batchId: row.stock.batchId,
						quantity: String(take)
					});
				remaining -= take;
			}

			if (remaining > 0) {
				throw error(400, 'Insufficient stock at fulfilling store');
			}

			await tx
				.update(table.invDepartmentIndentLineTable)
				.set({
					qtyIssued: needIssue,
					updatedBy: userId
				})
				.where(eq(table.invDepartmentIndentLineTable.id, line.id));
		}

		await tx
			.update(table.invDepartmentIndentTable)
			.set({
				statusTaggingId: InvDepartmentIndentStatusTaggingEnum.ISSUED,
				issuedBy: userId,
				issuedAt: sql<string>`now()`,
				updatedBy: userId
			})
			.where(eq(table.invDepartmentIndentTable.id, input.indentId));
	});

	return getDepartmentIndentById(event, {
		hospitalId: input.hospitalId,
		id: input.indentId
	});
}

/**
 * Receiving (requesting) store acknowledges: add stock from issue allocations.
 */
export async function postDepartmentIndentReceive(
	event: RequestEvent,
	input: { hospitalId: string; indentId: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');

	const detail = await getDepartmentIndentById(event, {
		hospitalId: input.hospitalId,
		id: input.indentId
	});
	if (!detail) throw error(404, 'Indent not found');
	if (
		detail.statusTaggingId !==
		InvDepartmentIndentStatusTaggingEnum.ISSUED
	) {
		throw error(400, 'Indent is not issued or already received');
	}
	const destStore = detail.fromStoreId;

	const allocRows = await ensureDb()
		.select({
			alloc: table.invDepartmentIndentLineAllocTable,
			line: table.invDepartmentIndentLineTable
		})
		.from(table.invDepartmentIndentLineAllocTable)
		.innerJoin(
			table.invDepartmentIndentLineTable,
			eq(
				table.invDepartmentIndentLineAllocTable.lineId,
				table.invDepartmentIndentLineTable.id
			)
		)
		.where(
			eq(table.invDepartmentIndentLineTable.indentId, input.indentId)
		);
	if (allocRows.length === 0) {
		throw error(400, 'No allocations to receive');
	}

	await ensureDb().transaction(async (tx) => {
		for (const { alloc, line } of allocRows) {
			await addDeltaToInvStock(tx, {
				hospitalId: input.hospitalId,
				itemId: line.itemId,
				storeId: destStore,
				batchId: alloc.batchId,
				delta: String(alloc.quantity),
				userId
			});
		}
		await tx
			.update(table.invDepartmentIndentTable)
			.set({
				statusTaggingId:
					InvDepartmentIndentStatusTaggingEnum.RECEIVED,
				receivedBy: userId,
				receivedAt: sql<string>`now()`,
				updatedBy: userId
			})
			.where(eq(table.invDepartmentIndentTable.id, input.indentId));
	});

	return getDepartmentIndentById(event, {
		hospitalId: input.hospitalId,
		id: input.indentId
	});
}
