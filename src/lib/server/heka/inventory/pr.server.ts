import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	InvApprovalActionEnum,
	InvPrStatusTaggingEnum
} from '$lib/model/enum/db-link';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { generatePrefix } from '$lib/server/heka/prefix/prefix-generator.server';
import {
	assertStaffCanApproveLevel,
	getMaxApprovalLevel,
	listApprovalLogs,
	listPrApproverStoreLevelsForStaff
} from './approval-workflow.server';
import {
	assertStoreInHospital,
	ensureHospitalInventoryAccess,
	getStaffIdForUser
} from './inventory-scope.server';
import type { InvApprovalModule } from './approval-config.server';
import { resolveItemUnitMastersByItemAndPurchaseUnit } from '$lib/server/heka/administration/item-master.server';

const EDITABLE_PR_STATUSES = new Set([
	InvPrStatusTaggingEnum.DRAFT,
	InvPrStatusTaggingEnum.PENDING,
	InvPrStatusTaggingEnum.SENT_BACK,
	InvPrStatusTaggingEnum.REJECTED
]);

const CANCELLABLE_PR_STATUSES = new Set([
	InvPrStatusTaggingEnum.DRAFT,
	InvPrStatusTaggingEnum.PENDING,
	InvPrStatusTaggingEnum.REJECTED,
	InvPrStatusTaggingEnum.SENT_BACK,
	InvPrStatusTaggingEnum.APPROVED
]);

export async function listPurchaseRequisitions(
	event: RequestEvent,
	input: {
		hospitalId: string;
		page?: number;
		pageSize?: number;
		storeId?: number;
		statusTaggingId?: number;
		prNo?: string;
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const { page, pageSize, limit, offset } = normalizePagination(input);

	let cond = and(
		eq(table.purchaseRequisitionTable.hospitalId, input.hospitalId),
		isNull(table.purchaseRequisitionTable.deletedAt)
	);
	if (typeof input.storeId === 'number') {
		cond = and(cond, eq(table.purchaseRequisitionTable.storeId, input.storeId))!;
	}
	if (typeof input.statusTaggingId === 'number') {
		cond = and(
			cond,
			eq(
				table.purchaseRequisitionTable.statusTaggingId,
				input.statusTaggingId
			)
		)!;
	}
	const prNoTerm = input.prNo?.trim();
	if (prNoTerm) {
		const safe = prNoTerm.replace(/[%_\\]/g, '');
		if (safe.length > 0) {
			cond = and(
				cond,
				ilike(table.purchaseRequisitionTable.prNo, `%${safe}%`)
			)!;
		}
	}

	const uCreated = alias(table.userTable, 'pr_created_by_user');
	const uUpdated = alias(table.userTable, 'pr_updated_by_user');
	const uApproved = alias(table.userTable, 'pr_approved_by_user');
	const uCancelled = alias(table.userTable, 'pr_cancelled_by_user');

	const [data, cnt] = await Promise.all([
		ensureDb()
			.select({
				pr: table.purchaseRequisitionTable,
				statusName: table.statusTaggingTable.name,
				statusCode: table.statusTaggingTable.code,
				storeName: table.storeTable.storeName,
				createdByName: uCreated.name,
				updatedByName: uUpdated.name,
				approvedByName: uApproved.name,
				cancelledByName: uCancelled.name
			})
			.from(table.purchaseRequisitionTable)
			.innerJoin(
				table.statusTaggingTable,
				eq(
					table.purchaseRequisitionTable.statusTaggingId,
					table.statusTaggingTable.id
				)
			)
			.innerJoin(
				table.storeTable,
				eq(table.purchaseRequisitionTable.storeId, table.storeTable.id)
			)
			.leftJoin(
				uCreated,
				eq(table.purchaseRequisitionTable.createdBy, uCreated.id)
			)
			.leftJoin(
				uUpdated,
				eq(table.purchaseRequisitionTable.updatedBy, uUpdated.id)
			)
			.leftJoin(
				uApproved,
				eq(table.purchaseRequisitionTable.approvedBy, uApproved.id)
			)
			.leftJoin(
				uCancelled,
				eq(table.purchaseRequisitionTable.cancelledBy, uCancelled.id)
			)
			.where(cond)
			.orderBy(desc(table.purchaseRequisitionTable.createdAt))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ c: count() })
			.from(table.purchaseRequisitionTable)
			.where(cond)
	]);

	const total = cnt[0]?.c ?? 0;

	const userId = event.locals.user?.id ?? null;
	const staffId = userId ? await getStaffIdForUser(userId) : null;
	let approverPairSet = new Set<string>();
	if (staffId) {
		const pairs = await listPrApproverStoreLevelsForStaff(
			input.hospitalId,
			staffId
		);
		approverPairSet = new Set(
			pairs.map((p) => `${p.storeId}:${p.level}`)
		);
	}

	const prIds = data.map((r) => r.pr.id);
	const poCountByPr = new Map<string, number>();
	if (prIds.length > 0) {
		const poGroups = await ensureDb()
			.select({
				prId: table.purchaseOrderTable.prId,
				c: count()
			})
			.from(table.purchaseOrderTable)
			.where(
				and(
					inArray(table.purchaseOrderTable.prId, prIds),
					isNull(table.purchaseOrderTable.deletedAt)
				)
			)
			.groupBy(table.purchaseOrderTable.prId);
		for (const g of poGroups) {
			if (g.prId != null) {
				poCountByPr.set(g.prId, Number(g.c));
			}
		}
	}

	return {
		data: data.map((r) => ({
			...r.pr,
			statusName: r.statusName,
			statusCode: r.statusCode,
			storeName: r.storeName,
			createdByName: r.createdByName ?? null,
			updatedByName: r.updatedByName ?? null,
			approvedByName: r.approvedByName ?? null,
			cancelledByName: r.cancelledByName ?? null,
			poCount: poCountByPr.get(r.pr.id) ?? 0,
			canApprove:
				r.pr.statusTaggingId === InvPrStatusTaggingEnum.PENDING &&
				approverPairSet.has(`${r.pr.storeId}:${r.pr.currentLevel}`)
		})),
		total,
		page,
		pageSize,
		totalPages: Math.ceil(Number(total) / pageSize) || 1
	};
}

export async function getPurchaseRequisitionById(
	event: RequestEvent,
	input: { hospitalId: string; id: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const uCreated = alias(table.userTable, 'pr_detail_created_by_user');
	const uUpdated = alias(table.userTable, 'pr_detail_updated_by_user');
	const uApproved = alias(table.userTable, 'pr_detail_approved_by_user');
	const uCancelled = alias(table.userTable, 'pr_detail_cancelled_by_user');

	const [row] = await ensureDb()
		.select({
			pr: table.purchaseRequisitionTable,
			statusName: table.statusTaggingTable.name,
			statusCode: table.statusTaggingTable.code,
			storeName: table.storeTable.storeName,
			createdByName: uCreated.name,
			updatedByName: uUpdated.name,
			approvedByName: uApproved.name,
			cancelledByName: uCancelled.name
		})
		.from(table.purchaseRequisitionTable)
		.innerJoin(
			table.statusTaggingTable,
			eq(
				table.purchaseRequisitionTable.statusTaggingId,
				table.statusTaggingTable.id
			)
		)
		.innerJoin(
			table.storeTable,
			eq(table.purchaseRequisitionTable.storeId, table.storeTable.id)
		)
		.leftJoin(
			uCreated,
			eq(table.purchaseRequisitionTable.createdBy, uCreated.id)
		)
		.leftJoin(
			uUpdated,
			eq(table.purchaseRequisitionTable.updatedBy, uUpdated.id)
		)
		.leftJoin(
			uApproved,
			eq(table.purchaseRequisitionTable.approvedBy, uApproved.id)
		)
		.leftJoin(
			uCancelled,
			eq(table.purchaseRequisitionTable.cancelledBy, uCancelled.id)
		)
		.where(
			and(
				eq(table.purchaseRequisitionTable.id, input.id),
				eq(table.purchaseRequisitionTable.hospitalId, input.hospitalId),
				isNull(table.purchaseRequisitionTable.deletedAt)
			)
		)
		.limit(1);
	if (!row) return null;

	const [poCntRow] = await ensureDb()
		.select({ c: count() })
		.from(table.purchaseOrderTable)
		.where(
			and(
				eq(table.purchaseOrderTable.prId, input.id),
				isNull(table.purchaseOrderTable.deletedAt)
			)
		);
	const poCount = Number(poCntRow?.c ?? 0);

	const lineRows = await ensureDb()
		.select({
			line: table.purchaseRequisitionLineTable,
			itemName: table.itemMasterTable.itemName
		})
		.from(table.purchaseRequisitionLineTable)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.purchaseRequisitionLineTable.itemId,
				table.itemMasterTable.id
			)
		)
		.where(
			and(
				eq(table.purchaseRequisitionLineTable.prId, input.id),
				isNull(table.purchaseRequisitionLineTable.deletedAt)
			)
		);

	const iumMap = await resolveItemUnitMastersByItemAndPurchaseUnit(
		input.hospitalId,
		lineRows.map((l) => ({
			itemId: l.line.itemId,
			purchaseUnitId: l.line.unitId
		}))
	);

	const logs = await listApprovalLogs(input.hospitalId, input.id);

	return {
		...row.pr,
		statusName: row.statusName,
		statusCode: row.statusCode,
		storeName: row.storeName,
		createdByName: row.createdByName ?? null,
		updatedByName: row.updatedByName ?? null,
		approvedByName: row.approvedByName ?? null,
		cancelledByName: row.cancelledByName ?? null,
		poCount,
		lines: lineRows.map((l) => {
			const k = `${l.line.itemId}:${l.line.unitId}`;
			const ium = iumMap.get(k);
			return {
				...l.line,
				itemName: l.itemName,
				itemUnitMasterId: ium?.id ?? null,
				itemUnitMasterConversion: ium?.conversionDisplay ?? null
			};
		}),
		logs
	};
}

export async function createPurchaseRequisition(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId: number;
		remarks: string | null;
		lines: { itemId: number; quantity: string; unitId: number }[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const store = await assertStoreInHospital(input.hospitalId, input.storeId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	if (input.lines.length === 0) throw error(400, 'At least one line required');

	// PR No: require explicit prefix configuration for this hospital.
	const [prefixRow] = await ensureDb()
		.select({ id: table.prefixFormatTable.id })
		.from(table.prefixFormatTable)
		.where(
			and(
				eq(table.prefixFormatTable.hospitalId, input.hospitalId),
				eq(
					table.prefixFormatTable.key,
					PREFIX_PURPOSE_STORAGE.PURCHASE_REQUISITION_NO
				),
				isNull(table.prefixFormatTable.deletedAt)
			)
		)
		.limit(1);
	if (!prefixRow) {
		throw error(
			400,
			'Unable to generate PR No (PURCHASE_REQUISITION_NO). Configure it in Prefix Configuration.'
		);
	}

	const branchId = store.branchId;
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
		throw error(400, 'Financial year is not configured for this hospital.');
	}

	let prNo: string;
	try {
		prNo = await generatePrefix({
			hospitalId: input.hospitalId,
			branchId,
			financialYearId: financialYear.id,
			prefixKey: PREFIX_PURPOSE_STORAGE.PURCHASE_REQUISITION_NO,
			context: {}
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		throw error(
			400,
			`Unable to generate PR No (PURCHASE_REQUISITION_NO). Configure it in Prefix Configuration. (${msg})`
		);
	}

	const prId = await ensureDb().transaction(async (tx) => {
		const [pr] = await tx
			.insert(table.purchaseRequisitionTable)
			.values({
				prNo,
				hospitalId: input.hospitalId,
				storeId: input.storeId,
				requestedBy: userId,
				statusTaggingId: InvPrStatusTaggingEnum.PENDING,
				currentLevel: 1,
				remarks: input.remarks,
				createdBy: userId,
				updatedBy: userId
			})
			.returning({ id: table.purchaseRequisitionTable.id });
		if (!pr) throw error(500, 'Insert failed');

		await tx.insert(table.purchaseRequisitionLineTable).values(
			input.lines.map((l) => ({
				prId: pr.id,
				itemId: l.itemId,
				quantity: l.quantity,
				unitId: l.unitId,
				qtyRemaining: l.quantity,
				createdBy: userId,
				updatedBy: userId
			}))
		);
		return pr.id;
	});

	return getPurchaseRequisitionById(event, {
		hospitalId: input.hospitalId,
		id: prId
	});
}

export async function updatePurchaseRequisition(
	event: RequestEvent,
	input: {
		hospitalId: string;
		id: string;
		remarks?: string | null;
		lines?: { itemId: number; quantity: string; unitId: number }[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');

	const [pr] = await ensureDb()
		.select()
		.from(table.purchaseRequisitionTable)
		.where(
			and(
				eq(table.purchaseRequisitionTable.id, input.id),
				eq(table.purchaseRequisitionTable.hospitalId, input.hospitalId),
				isNull(table.purchaseRequisitionTable.deletedAt)
			)
		)
		.limit(1);
	if (!pr) throw error(404, 'PR not found');
	if (!EDITABLE_PR_STATUSES.has(pr.statusTaggingId)) {
		throw error(400, 'PR cannot be edited in current status');
	}

	await ensureDb().transaction(async (tx) => {
		if (input.remarks !== undefined) {
			await tx
				.update(table.purchaseRequisitionTable)
				.set({ remarks: input.remarks, updatedBy: userId })
				.where(eq(table.purchaseRequisitionTable.id, input.id));
		}
		if (input.lines) {
			if (input.lines.length === 0) throw error(400, 'Lines required');
			await tx
				.delete(table.purchaseRequisitionLineTable)
				.where(eq(table.purchaseRequisitionLineTable.prId, input.id));
			await tx.insert(table.purchaseRequisitionLineTable).values(
				input.lines.map((l) => ({
					prId: input.id,
					itemId: l.itemId,
					quantity: l.quantity,
					unitId: l.unitId,
					qtyRemaining: l.quantity,
					createdBy: userId,
					updatedBy: userId
				}))
			);
		}
	});

	return getPurchaseRequisitionById(event, {
		hospitalId: input.hospitalId,
		id: input.id
	});
}

export async function approvePurchaseRequisition(
	event: RequestEvent,
	input: {
		hospitalId: string;
		prId: string;
		action: number;
		remarks: string | null;
		lineAdjustments?: { lineId: number; quantity: string }[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	const staffId = await getStaffIdForUser(userId);
	if (!staffId) throw error(403, 'Staff profile required to approve');

	const [pr] = await ensureDb()
		.select()
		.from(table.purchaseRequisitionTable)
		.where(
			and(
				eq(table.purchaseRequisitionTable.id, input.prId),
				eq(table.purchaseRequisitionTable.hospitalId, input.hospitalId),
				isNull(table.purchaseRequisitionTable.deletedAt)
			)
		)
		.limit(1);
	if (!pr) throw error(404, 'PR not found');
	if (pr.statusTaggingId !== InvPrStatusTaggingEnum.PENDING) {
		throw error(400, 'PR is not awaiting approval');
	}

	const maxLevel = await getMaxApprovalLevel(
		input.hospitalId,
		pr.storeId,
		'PR'
	);
	if (maxLevel < 1)
		throw error(400, 'Configure approval levels for this store (PR)');

	const module: InvApprovalModule = 'PR';
	await assertStaffCanApproveLevel(
		input.hospitalId,
		pr.storeId,
		module,
		pr.currentLevel,
		staffId
	);

	await ensureDb().transaction(async (tx) => {
		if (
			input.action === InvApprovalActionEnum.APPROVED &&
			input.lineAdjustments?.length
		) {
			for (const adj of input.lineAdjustments) {
				const [ln] = await tx
					.select()
					.from(table.purchaseRequisitionLineTable)
					.where(
						and(
							eq(table.purchaseRequisitionLineTable.id, adj.lineId),
							eq(table.purchaseRequisitionLineTable.prId, input.prId),
							isNull(table.purchaseRequisitionLineTable.deletedAt)
						)
					)
					.limit(1);
				if (!ln) throw error(400, `Invalid line ${adj.lineId}`);
				const q = Number(adj.quantity);
				if (!Number.isFinite(q) || q <= 0)
					throw error(400, 'Invalid adjusted quantity');
				await tx
					.update(table.purchaseRequisitionLineTable)
					.set({
						quantity: adj.quantity,
						qtyRemaining: adj.quantity,
						updatedBy: userId
					})
					.where(eq(table.purchaseRequisitionLineTable.id, adj.lineId));
			}
		}

		if (input.action === InvApprovalActionEnum.REJECTED) {
			await tx
				.update(table.purchaseRequisitionTable)
				.set({
					statusTaggingId: InvPrStatusTaggingEnum.REJECTED,
					updatedBy: userId
				})
				.where(eq(table.purchaseRequisitionTable.id, input.prId));
		} else if (input.action === InvApprovalActionEnum.SENT_BACK) {
			await tx
				.update(table.purchaseRequisitionTable)
				.set({
					statusTaggingId: InvPrStatusTaggingEnum.SENT_BACK,
					currentLevel: 1,
					updatedBy: userId
				})
				.where(eq(table.purchaseRequisitionTable.id, input.prId));
		} else if (input.action === InvApprovalActionEnum.APPROVED) {
			if (pr.currentLevel < maxLevel) {
				await tx
					.update(table.purchaseRequisitionTable)
					.set({
						currentLevel: pr.currentLevel + 1,
						updatedBy: userId
					})
					.where(eq(table.purchaseRequisitionTable.id, input.prId));
			} else {
				await tx
					.update(table.purchaseRequisitionTable)
					.set({
						statusTaggingId: InvPrStatusTaggingEnum.APPROVED,
						updatedBy: userId,
						approvedBy: userId,
						approvedAt: sql<string>`now()`
					})
					.where(eq(table.purchaseRequisitionTable.id, input.prId));
			}
		}

		await tx.insert(table.invApprovalLogTable).values({
			hospitalId: input.hospitalId,
			documentId: input.prId,
			module: 'PR',
			level: pr.currentLevel,
			action: input.action,
			remarks: input.remarks,
			approvedBy: userId,
			lineAdjustments: input.lineAdjustments ?? null
		});
	});

	return getPurchaseRequisitionById(event, {
		hospitalId: input.hospitalId,
		id: input.prId
	});
}

export async function resubmitPurchaseRequisition(
	event: RequestEvent,
	input: { hospitalId: string; prId: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');

	const [pr] = await ensureDb()
		.select()
		.from(table.purchaseRequisitionTable)
		.where(
			and(
				eq(table.purchaseRequisitionTable.id, input.prId),
				eq(table.purchaseRequisitionTable.hospitalId, input.hospitalId),
				isNull(table.purchaseRequisitionTable.deletedAt)
			)
		)
		.limit(1);
	if (!pr) throw error(404, 'PR not found');
	if (
		pr.statusTaggingId !== InvPrStatusTaggingEnum.SENT_BACK &&
		pr.statusTaggingId !== InvPrStatusTaggingEnum.REJECTED
	) {
		throw error(400, 'PR cannot be resubmitted from this status');
	}

	await ensureDb()
		.update(table.purchaseRequisitionTable)
		.set({
			statusTaggingId: InvPrStatusTaggingEnum.PENDING,
			currentLevel: 1,
			updatedBy: userId
		})
		.where(eq(table.purchaseRequisitionTable.id, input.prId));

	return getPurchaseRequisitionById(event, {
		hospitalId: input.hospitalId,
		id: input.prId
	});
}

export async function cancelPurchaseRequisition(
	event: RequestEvent,
	input: { hospitalId: string; prId: string; reason: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');

	const reason = input.reason.trim();
	if (!reason) throw error(400, 'Cancel reason is required');

	const [pr] = await ensureDb()
		.select()
		.from(table.purchaseRequisitionTable)
		.where(
			and(
				eq(table.purchaseRequisitionTable.id, input.prId),
				eq(table.purchaseRequisitionTable.hospitalId, input.hospitalId),
				isNull(table.purchaseRequisitionTable.deletedAt)
			)
		)
		.limit(1);
	if (!pr) throw error(404, 'PR not found');
	if (pr.statusTaggingId === InvPrStatusTaggingEnum.CANCELLED) {
		throw error(400, 'PR is already cancelled');
	}
	if (!CANCELLABLE_PR_STATUSES.has(pr.statusTaggingId)) {
		throw error(400, 'PR cannot be cancelled in current status');
	}

	const [poCntRow] = await ensureDb()
		.select({ c: count() })
		.from(table.purchaseOrderTable)
		.where(
			and(
				eq(table.purchaseOrderTable.prId, input.prId),
				isNull(table.purchaseOrderTable.deletedAt)
			)
		);
	if (Number(poCntRow?.c ?? 0) > 0) {
		throw error(400, 'Cannot cancel: a purchase order exists for this PR');
	}

	await ensureDb()
		.update(table.purchaseRequisitionTable)
		.set({
			statusTaggingId: InvPrStatusTaggingEnum.CANCELLED,
			cancelledBy: userId,
			cancelledAt: sql<string>`now()`,
			cancelReason: reason,
			updatedBy: userId
		})
		.where(eq(table.purchaseRequisitionTable.id, input.prId));

	return getPurchaseRequisitionById(event, {
		hospitalId: input.hospitalId,
		id: input.prId
	});
}
