import { error, type RequestEvent } from '@sveltejs/kit';
import { alias } from 'drizzle-orm/pg-core';
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	sql
} from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	InvApprovalActionEnum,
	InvDepartmentConsumptionStatusTaggingEnum
} from '$lib/model/enum/db-link';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { generatePrefix } from '$lib/server/heka/prefix/prefix-generator.server';
import { uuidv7 } from 'uuidv7';
import {
	assertStaffAssignedForModule,
	assertStaffCanApproveLevel,
	getMaxApprovalLevel,
	listDcApproverStoreLevelsForStaff,
	listApprovalLogs
} from './approval-workflow.server';
import {
	assertStoreInHospital,
	ensureHospitalInventoryAccess,
	getStaffIdForUser
} from './inventory-scope.server';
import { computeSalePriceAtTransactionDb } from './sale-price.server';
import { resolveItemUnitMastersByItemAndPurchaseUnit } from '$lib/server/heka/administration/item-master.server';
import { addDeltaToInvStock } from './item-batch.server';
import { issueQtyStringFromPurchaseReceipt } from './item-unit-inventory.server';
import { parsePositiveIntQty } from './inv-validate.server';

export type ConsumptionLineInput = {
	itemId: number;
	quantity: string;
	unitId: number;
	batchId: number;
	remarks?: string | null;
};

async function validateLineBatchesForHospital(
	hospitalId: string,
	lines: { itemId: number; batchId: number }[]
): Promise<void> {
	if (lines.length === 0) return;
	const batchIds = [...new Set(lines.map((l) => l.batchId))];
	const batches = await ensureDb()
		.select({
			id: table.itemBatchTable.id,
			itemId: table.itemBatchTable.itemId
		})
		.from(table.itemBatchTable)
		.where(
			and(
				eq(table.itemBatchTable.hospitalId, hospitalId),
				inArray(table.itemBatchTable.id, batchIds)
			)
		);
	const byId = new Map(batches.map((b) => [b.id, b]));
	for (const line of lines) {
		const b = byId.get(line.batchId);
		if (!b) throw error(400, 'Invalid batch for this hospital');
		if (b.itemId !== line.itemId) {
			throw error(400, 'Batch does not match item on line');
		}
	}
}

async function allocateConsumptionNo(
	hospitalId: string,
	branchId: string
): Promise<string> {
	const [prefixRow] = await ensureDb()
		.select({ id: table.prefixFormatTable.id })
		.from(table.prefixFormatTable)
		.where(
			and(
				eq(table.prefixFormatTable.hospitalId, hospitalId),
				eq(
					table.prefixFormatTable.key,
					PREFIX_PURPOSE_STORAGE.DEPARTMENT_CONSUMPTION_NO
				),
				isNull(table.prefixFormatTable.deletedAt)
			)
		)
		.limit(1);
	if (!prefixRow) {
		throw error(
			400,
			'Unable to generate Consumption No (DEPARTMENT_CONSUMPTION_NO). Configure it in Prefix Configuration.'
		);
	}

	const today = new Date();
	const [financialYear] = await ensureDb()
		.select({ id: table.financialYearTable.id })
		.from(table.financialYearTable)
		.where(
			and(
				eq(table.financialYearTable.hospitalId, hospitalId),
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

	try {
		return await generatePrefix({
			hospitalId,
			branchId,
			financialYearId: financialYear.id,
			prefixKey: PREFIX_PURPOSE_STORAGE.DEPARTMENT_CONSUMPTION_NO,
			context: {}
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		throw error(
			400,
			`Unable to generate Consumption No (DEPARTMENT_CONSUMPTION_NO). Configure it in Prefix Configuration. (${msg})`
		);
	}
}

export async function listDepartmentConsumptions(
	event: RequestEvent,
	input: {
		hospitalId: string;
		page?: number;
		pageSize?: number;
		storeId?: number;
		statusTaggingId?: number;
		consumptionNo?: string;
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const { page, pageSize, limit, offset } =
		normalizePagination(input);

	let cond = and(
		eq(
			table.invDepartmentConsumptionTable.hospitalId,
			input.hospitalId
		),
		isNull(table.invDepartmentConsumptionTable.deletedAt)
	);
	if (typeof input.storeId === 'number') {
		cond = and(
			cond,
			eq(table.invDepartmentConsumptionTable.storeId, input.storeId)
		)!;
	}
	if (typeof input.statusTaggingId === 'number') {
		cond = and(
			cond,
			eq(
				table.invDepartmentConsumptionTable.statusTaggingId,
				input.statusTaggingId
			)
		)!;
	}
	const noTerm = input.consumptionNo?.trim();
	if (noTerm) {
		const safe = noTerm.replace(/[%_\\]/g, '');
		if (safe) {
			cond = and(
				cond,
				ilike(
					table.invDepartmentConsumptionTable.consumptionNo,
					`%${safe}%`
				)
			)!;
		}
	}

	const st = table.statusTaggingTable;
	const line = table.invDepartmentConsumptionLineTable;
	const item = table.itemMasterTable;
	const uCreated = alias(table.userTable, 'dc_list_created_by');
	const uUpdated = alias(table.userTable, 'dc_list_updated_by');
	const uReq = alias(table.userTable, 'dc_list_requested_by');
	const uAppr = alias(table.userTable, 'dc_list_approved_by');
	const uCancel = alias(table.userTable, 'dc_list_cancelled_by');

	const itemNamesAgg = ensureDb()
		.select({
			consumptionId: line.consumptionId,
			itemNames:
				sql<string>`string_agg(distinct ${item.itemName}, ', ')`.as(
					'itemNames'
				)
		})
		.from(line)
		.innerJoin(item, eq(line.itemId, item.id))
		.where(isNull(line.deletedAt))
		.groupBy(line.consumptionId)
		.as('dc_item_names');

	const [data, cnt] = await Promise.all([
		ensureDb()
			.select({
				row: table.invDepartmentConsumptionTable,
				storeName: table.storeTable.storeName,
				statusName: st.name,
				itemNames: itemNamesAgg.itemNames,
				createdByName: sql<string>`coalesce(${uCreated.name}, ${uReq.name})`,
				updatedByName: sql<string>`coalesce(${uUpdated.name}, ${uCreated.name}, ${uReq.name})`,
				approvedByName: uAppr.name,
				cancelledByName: uCancel.name
			})
			.from(table.invDepartmentConsumptionTable)
			.leftJoin(
				itemNamesAgg,
				eq(
					table.invDepartmentConsumptionTable.id,
					itemNamesAgg.consumptionId
				)
			)
			.innerJoin(
				table.storeTable,
				eq(
					table.invDepartmentConsumptionTable.storeId,
					table.storeTable.id
				)
			)
			.innerJoin(
				st,
				eq(table.invDepartmentConsumptionTable.statusTaggingId, st.id)
			)
			.leftJoin(
				uReq,
				eq(table.invDepartmentConsumptionTable.requestedBy, uReq.id)
			)
			.leftJoin(
				uCreated,
				eq(table.invDepartmentConsumptionTable.createdBy, uCreated.id)
			)
			.leftJoin(
				uUpdated,
				eq(table.invDepartmentConsumptionTable.updatedBy, uUpdated.id)
			)
			.leftJoin(
				uAppr,
				eq(table.invDepartmentConsumptionTable.approvedBy, uAppr.id)
			)
			.leftJoin(
				uCancel,
				eq(
					table.invDepartmentConsumptionTable.cancelledBy,
					uCancel.id
				)
			)
			.where(cond)
			.orderBy(desc(table.invDepartmentConsumptionTable.createdAt))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ c: count() })
			.from(table.invDepartmentConsumptionTable)
			.where(cond)
	]);

	const total = cnt[0]?.c ?? 0;

	const userId = event.locals.user?.id ?? null;
	const staffId = userId ? await getStaffIdForUser(userId) : null;
	let dcPairSet = new Set<string>();
	if (staffId) {
		const pairs = await listDcApproverStoreLevelsForStaff(
			input.hospitalId,
			staffId
		);
		dcPairSet = new Set(pairs.map((p) => `${p.storeId}:${p.level}`));
	}

	const rowsOut = await Promise.all(
		data.map(async (r) => {
			const row = r.row;
			const canApprove =
				row.statusTaggingId ===
					InvDepartmentConsumptionStatusTaggingEnum.PENDING &&
				dcPairSet.has(`${row.storeId}:${row.currentLevel}`);
			const canManageOpen = await computeCanManageOpenConsumption({
				hospitalId: input.hospitalId,
				requestedBy: row.requestedBy,
				storeId: row.storeId,
				userId,
				staffId,
				statusTaggingId: row.statusTaggingId
			});
			const canSubmitForApproval =
				canManageOpen &&
				row.statusTaggingId ===
					InvDepartmentConsumptionStatusTaggingEnum.DRAFT;
			return {
				...row,
				storeName: r.storeName ?? null,
				statusName: r.statusName ?? null,
				itemNames: r.itemNames ?? '',
				createdByName: r.createdByName ?? null,
				updatedByName: r.updatedByName ?? null,
				approvedByName: r.approvedByName ?? null,
				cancelledByName: r.cancelledByName ?? null,
				canApprove,
				canCancel: canManageOpen,
				canSubmitForApproval
			};
		})
	);

	return {
		data: rowsOut,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(Number(total) / pageSize) || 1
	};
}

async function computeCanManageOpenConsumption(input: {
	hospitalId: string;
	requestedBy: string;
	storeId: number;
	userId: string | null;
	staffId: string | null;
	statusTaggingId: number;
}): Promise<boolean> {
	// No draft flow: only pending docs can be managed/cancelled.
	if (
		input.statusTaggingId !==
		InvDepartmentConsumptionStatusTaggingEnum.PENDING
	) {
		return false;
	}
	// Requirement: only the requester (creator) can cancel from UI.
	return Boolean(input.userId && input.requestedBy === input.userId);
}

export async function getDepartmentConsumptionById(
	event: RequestEvent,
	input: { hospitalId: string; id: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);

	const uReq = alias(table.userTable, 'dc_consumption_req_user');
	const uAppr = alias(table.userTable, 'dc_consumption_appr_user');
	const uCancel = alias(
		table.userTable,
		'dc_consumption_cancel_user'
	);

	const [joined] = await ensureDb()
		.select({
			consumption: table.invDepartmentConsumptionTable,
			statusName: table.statusTaggingTable.name,
			statusCode: table.statusTaggingTable.code,
			storeName: table.storeTable.storeName,
			requestedByName: uReq.name,
			approvedByName: uAppr.name,
			cancelledByName: uCancel.name
		})
		.from(table.invDepartmentConsumptionTable)
		.innerJoin(
			table.statusTaggingTable,
			eq(
				table.invDepartmentConsumptionTable.statusTaggingId,
				table.statusTaggingTable.id
			)
		)
		.innerJoin(
			table.storeTable,
			eq(
				table.invDepartmentConsumptionTable.storeId,
				table.storeTable.id
			)
		)
		.leftJoin(
			uReq,
			eq(table.invDepartmentConsumptionTable.requestedBy, uReq.id)
		)
		.leftJoin(
			uAppr,
			eq(table.invDepartmentConsumptionTable.approvedBy, uAppr.id)
		)
		.leftJoin(
			uCancel,
			eq(table.invDepartmentConsumptionTable.cancelledBy, uCancel.id)
		)
		.where(
			and(
				eq(table.invDepartmentConsumptionTable.id, input.id),
				eq(
					table.invDepartmentConsumptionTable.hospitalId,
					input.hospitalId
				),
				isNull(table.invDepartmentConsumptionTable.deletedAt)
			)
		)
		.limit(1);

	if (!joined) return null;

	const lineRows = await ensureDb()
		.select({
			line: table.invDepartmentConsumptionLineTable,
			itemName: table.itemMasterTable.itemName,
			unitName: table.unitTable.name,
			batchNo: table.itemBatchTable.batchNo,
			expiryDate: table.itemBatchTable.expiryDate
		})
		.from(table.invDepartmentConsumptionLineTable)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.invDepartmentConsumptionLineTable.itemId,
				table.itemMasterTable.id
			)
		)
		.innerJoin(
			table.unitTable,
			eq(
				table.invDepartmentConsumptionLineTable.unitId,
				table.unitTable.id
			)
		)
		.innerJoin(
			table.itemBatchTable,
			eq(
				table.invDepartmentConsumptionLineTable.batchId,
				table.itemBatchTable.id
			)
		)
		.where(
			and(
				eq(
					table.invDepartmentConsumptionLineTable.consumptionId,
					input.id
				),
				isNull(table.invDepartmentConsumptionLineTable.deletedAt)
			)
		)
		.orderBy(asc(table.invDepartmentConsumptionLineTable.id));

	const iumMap = await resolveItemUnitMastersByItemAndPurchaseUnit(
		input.hospitalId,
		lineRows.map((l) => ({
			itemId: l.line.itemId,
			purchaseUnitId: l.line.unitId
		}))
	);

	const userId = event.locals.user?.id ?? null;
	const staffIdForApprove = userId
		? await getStaffIdForUser(userId)
		: null;
	let canApprove = false;
	if (
		staffIdForApprove &&
		joined.consumption.statusTaggingId ===
			InvDepartmentConsumptionStatusTaggingEnum.PENDING
	) {
		const pairs = await listDcApproverStoreLevelsForStaff(
			input.hospitalId,
			staffIdForApprove
		);
		const set = new Set(pairs.map((p) => `${p.storeId}:${p.level}`));
		canApprove = set.has(
			`${joined.consumption.storeId}:${joined.consumption.currentLevel}`
		);
	}

	const logs = await listApprovalLogs(input.hospitalId, input.id);

	const canManageOpen = await computeCanManageOpenConsumption({
		hospitalId: input.hospitalId,
		requestedBy: joined.consumption.requestedBy,
		storeId: joined.consumption.storeId,
		userId,
		staffId: staffIdForApprove,
		statusTaggingId: joined.consumption.statusTaggingId
	});
	const canCancel = canManageOpen;

	return {
		...joined.consumption,
		canApprove,
		canCancel,
		statusName: joined.statusName,
		statusCode: joined.statusCode,
		storeName: joined.storeName,
		requestedByName: joined.requestedByName ?? null,
		approvedByName: joined.approvedByName ?? null,
		cancelledByName: joined.cancelledByName ?? null,
		lines: lineRows.map((l) => {
			const k = `${l.line.itemId}:${l.line.unitId}`;
			const ium = iumMap.get(k);
			return {
				...l.line,
				itemName: l.itemName,
				unitName: l.unitName,
				batchNo: l.batchNo,
				expiryDate: l.expiryDate,
				itemUnitMasterId: ium?.id ?? null,
				itemUnitMasterConversion: ium?.conversionDisplay ?? null
			};
		}),
		logs
	};
}

/** Creates consumption as **pending approval** (consumption no. allocated). */
export async function createDepartmentConsumptionSubmitted(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId: number;
		remarks: string | null;
		lines: ConsumptionLineInput[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	if (input.lines.length === 0)
		throw error(400, 'At least one line required');

	const store = await assertStoreInHospital(
		input.hospitalId,
		input.storeId
	);
	await validateLineBatchesForHospital(
		input.hospitalId,
		input.lines.map((l) => ({ itemId: l.itemId, batchId: l.batchId }))
	);

	const branchId = store.branchId;
	if (!branchId) throw error(400, 'Store is missing branch context');

	const consumptionNo = await allocateConsumptionNo(
		input.hospitalId,
		branchId
	);

	const id = await ensureDb().transaction(async (tx) => {
		const newId = uuidv7();
		await tx.insert(table.invDepartmentConsumptionTable).values({
			id: newId,
			hospitalId: input.hospitalId,
			consumptionNo,
			storeId: input.storeId,
			requestedBy: userId,
			statusTaggingId:
				InvDepartmentConsumptionStatusTaggingEnum.PENDING,
			currentLevel: 1,
			remarks: input.remarks,
			createdBy: userId,
			updatedBy: userId
		});
		await tx.insert(table.invDepartmentConsumptionLineTable).values(
			input.lines.map((l) => ({
				consumptionId: newId,
				itemId: l.itemId,
				quantity: l.quantity,
				unitId: l.unitId,
				batchId: l.batchId,
				remarks: l.remarks ?? null,
				createdBy: userId,
				updatedBy: userId
			}))
		);
		return newId;
	});

	return getDepartmentConsumptionById(event, {
		hospitalId: input.hospitalId,
		id
	});
}

export async function approveDepartmentConsumption(
	event: RequestEvent,
	input: {
		hospitalId: string;
		consumptionId: string;
		action: number;
		remarks: string | null;
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	const staffId = await getStaffIdForUser(userId);
	if (!staffId) throw error(403, 'Staff profile required to approve');

	const [doc] = await ensureDb()
		.select()
		.from(table.invDepartmentConsumptionTable)
		.where(
			and(
				eq(
					table.invDepartmentConsumptionTable.id,
					input.consumptionId
				),
				eq(
					table.invDepartmentConsumptionTable.hospitalId,
					input.hospitalId
				),
				isNull(table.invDepartmentConsumptionTable.deletedAt)
			)
		)
		.limit(1);
	if (!doc) throw error(404, 'Consumption not found');
	if (
		doc.statusTaggingId !==
		InvDepartmentConsumptionStatusTaggingEnum.PENDING
	) {
		throw error(400, 'Consumption is not awaiting approval');
	}

	const maxLevel = await getMaxApprovalLevel(
		input.hospitalId,
		doc.storeId,
		'DC'
	);
	if (maxLevel < 1) {
		throw error(
			400,
			'Configure department consumption approvers for this store'
		);
	}
	await assertStaffCanApproveLevel(
		input.hospitalId,
		doc.storeId,
		'DC',
		doc.currentLevel,
		staffId
	);

	const rejectReason =
		input.remarks != null && String(input.remarks).trim() !== ''
			? String(input.remarks).trim()
			: 'Rejected by approver';

	await ensureDb().transaction(async (tx) => {
		if (input.action === InvApprovalActionEnum.REJECTED) {
			await tx
				.update(table.invDepartmentConsumptionTable)
				.set({
					statusTaggingId:
						InvDepartmentConsumptionStatusTaggingEnum.CANCELLED,
					cancelledBy: userId,
					cancelledAt: sql<string>`now()`,
					cancelReason: rejectReason,
					updatedBy: userId
				})
				.where(
					eq(
						table.invDepartmentConsumptionTable.id,
						input.consumptionId
					)
				);

			await tx.insert(table.invApprovalLogTable).values({
				hospitalId: input.hospitalId,
				documentId: input.consumptionId,
				module: 'DC',
				level: doc.currentLevel,
				action: input.action,
				remarks: input.remarks,
				approvedBy: userId
			});
			return;
		}

		if (input.action !== InvApprovalActionEnum.APPROVED) {
			throw error(400, 'Invalid approval action');
		}

		if (doc.currentLevel < maxLevel) {
			await tx
				.update(table.invDepartmentConsumptionTable)
				.set({
					currentLevel: doc.currentLevel + 1,
					updatedBy: userId
				})
				.where(
					eq(
						table.invDepartmentConsumptionTable.id,
						input.consumptionId
					)
				);

			await tx.insert(table.invApprovalLogTable).values({
				hospitalId: input.hospitalId,
				documentId: input.consumptionId,
				module: 'DC',
				level: doc.currentLevel,
				action: input.action,
				remarks: input.remarks,
				approvedBy: userId
			});
			return;
		}

		const lines = await tx
			.select()
			.from(table.invDepartmentConsumptionLineTable)
			.where(
				and(
					eq(
						table.invDepartmentConsumptionLineTable.consumptionId,
						input.consumptionId
					),
					isNull(table.invDepartmentConsumptionLineTable.deletedAt)
				)
			)
			.orderBy(asc(table.invDepartmentConsumptionLineTable.id));

		for (const line of lines) {
			const prices = await computeSalePriceAtTransactionDb({
				hospitalId: input.hospitalId,
				batchId: line.batchId,
				itemId: line.itemId,
				storeId: doc.storeId,
				module: 'DC'
			});
			await tx
				.update(table.invDepartmentConsumptionLineTable)
				.set({
					empSalePrice: prices.unitEmpSalePriceIssue,
					updatedBy: userId
				})
				.where(eq(table.invDepartmentConsumptionLineTable.id, line.id));

			const needIssue = await issueQtyStringFromPurchaseReceipt({
				hospitalId: input.hospitalId,
				itemId: line.itemId,
				purchaseUnitId: line.unitId,
				purchaseQtyStr: String(line.quantity)
			});
			const needN = parsePositiveIntQty(needIssue, 'quantity');

			const [stockRow] = await tx
				.select()
				.from(table.invStockTable)
				.where(
					and(
						eq(table.invStockTable.storeId, doc.storeId),
						eq(table.invStockTable.batchId, line.batchId),
						eq(table.invStockTable.itemId, line.itemId),
						isNull(table.invStockTable.deletedAt)
					)
				)
				.limit(1);

			const avail = stockRow ? Number(stockRow.quantity) : 0;
			if (avail + 1e-9 < needN) {
				throw error(400, 'Insufficient stock for a line');
			}

			await addDeltaToInvStock(tx, {
				hospitalId: input.hospitalId,
				itemId: line.itemId,
				storeId: doc.storeId,
				batchId: line.batchId,
				delta: String(-needN),
				userId
			});
		}

		await tx
			.update(table.invDepartmentConsumptionTable)
			.set({
				statusTaggingId:
					InvDepartmentConsumptionStatusTaggingEnum.POSTED,
				approvedBy: userId,
				approvedAt: sql<string>`now()`,
				updatedBy: userId
			})
			.where(
				eq(
					table.invDepartmentConsumptionTable.id,
					input.consumptionId
				)
			);

		await tx.insert(table.invApprovalLogTable).values({
			hospitalId: input.hospitalId,
			documentId: input.consumptionId,
			module: 'DC',
			level: doc.currentLevel,
			action: input.action,
			remarks: input.remarks,
			approvedBy: userId
		});
	});

	return getDepartmentConsumptionById(event, {
		hospitalId: input.hospitalId,
		id: input.consumptionId
	});
}

export async function cancelDepartmentConsumption(
	event: RequestEvent,
	input: { hospitalId: string; consumptionId: string; reason: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	const reason = input.reason.trim();
	if (!reason) throw error(400, 'Cancel reason is required');

	const [doc] = await ensureDb()
		.select()
		.from(table.invDepartmentConsumptionTable)
		.where(
			and(
				eq(
					table.invDepartmentConsumptionTable.id,
					input.consumptionId
				),
				eq(
					table.invDepartmentConsumptionTable.hospitalId,
					input.hospitalId
				),
				isNull(table.invDepartmentConsumptionTable.deletedAt)
			)
		)
		.limit(1);
	if (!doc) throw error(404, 'Consumption not found');
	if (
		doc.statusTaggingId ===
		InvDepartmentConsumptionStatusTaggingEnum.CANCELLED
	) {
		throw error(400, 'Consumption is already cancelled');
	}
	if (
		doc.statusTaggingId !==
			InvDepartmentConsumptionStatusTaggingEnum.DRAFT &&
		doc.statusTaggingId !==
			InvDepartmentConsumptionStatusTaggingEnum.PENDING
	) {
		throw error(
			400,
			'Consumption cannot be cancelled in current status'
		);
	}

	const staffIdForCancel = await getStaffIdForUser(userId);
	const allowed = await computeCanManageOpenConsumption({
		hospitalId: input.hospitalId,
		requestedBy: doc.requestedBy,
		storeId: doc.storeId,
		userId,
		staffId: staffIdForCancel,
		statusTaggingId: doc.statusTaggingId
	});
	if (!allowed) throw error(403, 'You cannot cancel this document');

	await ensureDb()
		.update(table.invDepartmentConsumptionTable)
		.set({
			statusTaggingId:
				InvDepartmentConsumptionStatusTaggingEnum.CANCELLED,
			cancelledBy: userId,
			cancelledAt: sql<string>`now()`,
			cancelReason: reason,
			updatedBy: userId
		})
		.where(
			eq(table.invDepartmentConsumptionTable.id, input.consumptionId)
		);

	return getDepartmentConsumptionById(event, {
		hospitalId: input.hospitalId,
		id: input.consumptionId
	});
}
