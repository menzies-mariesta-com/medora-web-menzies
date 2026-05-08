import { error, type RequestEvent } from '@sveltejs/kit';
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	ne,
	sql,
	type SQL
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	InvApprovalActionEnum,
	InvPoStatusTaggingEnum,
	InvPrStatusTaggingEnum,
	StatusEnum
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
		/** When set, only PRs where this store is the requesting (from) store. */
		storeId?: number;
		/** When set, only PRs where this store is the to store (receiver). */
		toStoreId?: number;
		statusTaggingId?: number;
		prNo?: string;
		/** Substring match against any PR line item name. */
		item?: string;
		/** When true, only return PRs with remaining qty to order (sum(qty_remaining) > 0). */
		onlyWithRemainingQty?: boolean;
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const { page, pageSize, limit, offset } = normalizePagination(input);

	let cond = and(
		eq(table.purchaseRequisitionTable.hospitalId, input.hospitalId),
		isNull(table.purchaseRequisitionTable.deletedAt)
	);
	/** Top-bar / list filter: only requisitions raised by this store (from = requesting). */
	if (typeof input.storeId === 'number') {
		cond = and(
			cond,
			eq(table.purchaseRequisitionTable.fromStoreId, input.storeId)
		)!;
	}
	if (typeof input.toStoreId === 'number') {
		cond = and(
			cond,
			eq(table.purchaseRequisitionTable.toStoreId, input.toStoreId)
		)!;
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

	const itemTerm = input.item?.trim();
	if (itemTerm) {
		const safe = itemTerm.replace(/[%_\\]/g, '');
		if (safe.length > 0) {
			cond = and(
				cond,
				sql`exists (
					select 1
					from purchase_requisition_line prl
					inner join item_master im
						on prl.item_id = im.id
					where prl.pr_id = ${table.purchaseRequisitionTable.id}
						and prl.deleted_at is null
						and im.item_name ilike ${`%${safe}%`}
				)`
			)!;
		}
	}

	if (input.onlyWithRemainingQty) {
		cond = and(
			cond,
			sql`exists (
				select 1
				from purchase_requisition_line prl
				where prl.pr_id = ${table.purchaseRequisitionTable.id}
					and prl.deleted_at is null
					and (prl.qty_remaining::numeric) > 0
			)`
		)!;
	}

	const uCreated = alias(table.userTable, 'pr_created_by_user');
	const uUpdated = alias(table.userTable, 'pr_updated_by_user');
	const uApproved = alias(table.userTable, 'pr_approved_by_user');
	const uCancelled = alias(table.userTable, 'pr_cancelled_by_user');
	const fromStoreTbl = alias(table.storeTable, 'pr_list_from_store');
	const toStoreTbl = alias(table.storeTable, 'pr_list_to_store');

	const [data, cnt] = await Promise.all([
		ensureDb()
			.select({
				pr: table.purchaseRequisitionTable,
				statusName: table.statusTaggingTable.name,
				statusCode: table.statusTaggingTable.code,
				fromStoreName: fromStoreTbl.storeName,
				toStoreName: toStoreTbl.storeName,
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
				fromStoreTbl,
				eq(
					table.purchaseRequisitionTable.fromStoreId,
					fromStoreTbl.id
				)
			)
			.innerJoin(
				toStoreTbl,
				eq(table.purchaseRequisitionTable.toStoreId, toStoreTbl.id)
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

	const itemNamesByPr = new Map<string, string>();
	if (prIds.length > 0) {
		const rows = await ensureDb()
			.select({
				prId: table.purchaseRequisitionLineTable.prId,
				itemNames: sql<string>`string_agg(distinct ${table.itemMasterTable.itemName}, ', ')`
			})
			.from(table.purchaseRequisitionLineTable)
			.innerJoin(
				table.itemMasterTable,
				eq(
					table.purchaseRequisitionLineTable.itemId,
					table.itemMasterTable.id
				)
			)
			.where(inArray(table.purchaseRequisitionLineTable.prId, prIds))
			.groupBy(table.purchaseRequisitionLineTable.prId);
		for (const r of rows) {
			if (r.prId != null) {
				itemNamesByPr.set(r.prId, r.itemNames ?? '');
			}
		}
	}

	return {
		data: data.map((r) => ({
			...r.pr,
			statusName: r.statusName,
			statusCode: r.statusCode,
			fromStoreName: r.fromStoreName,
			toStoreName: r.toStoreName,
			createdByName: r.createdByName ?? null,
			updatedByName: r.updatedByName ?? null,
			approvedByName: r.approvedByName ?? null,
			cancelledByName: r.cancelledByName ?? null,
			itemNames: itemNamesByPr.get(r.pr.id) ?? '',
			poCount: poCountByPr.get(r.pr.id) ?? 0,
			canApprove:
				r.pr.statusTaggingId === InvPrStatusTaggingEnum.PENDING &&
				approverPairSet.has(
					`${r.pr.fromStoreId}:${r.pr.currentLevel}`
				)
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
	const fromStoreD = alias(table.storeTable, 'pr_detail_from_store');
	const toStoreD = alias(table.storeTable, 'pr_detail_to_store');

	const [row] = await ensureDb()
		.select({
			pr: table.purchaseRequisitionTable,
			statusName: table.statusTaggingTable.name,
			statusCode: table.statusTaggingTable.code,
			fromStoreName: fromStoreD.storeName,
			toStoreName: toStoreD.storeName,
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
			fromStoreD,
			eq(
				table.purchaseRequisitionTable.fromStoreId,
				fromStoreD.id
			)
		)
		.innerJoin(
			toStoreD,
			eq(table.purchaseRequisitionTable.toStoreId, toStoreD.id)
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

	const linkedRows = await ensureDb()
		.select({
			id: table.purchaseOrderTable.id,
			poNo: table.purchaseOrderTable.poNo
		})
		.from(table.purchaseOrderTable)
		.where(
			and(
				eq(table.purchaseOrderTable.prId, input.id),
				isNull(table.purchaseOrderTable.deletedAt)
			)
		)
		.orderBy(asc(table.purchaseOrderTable.createdAt));

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

	const metricLineKeysSeen = new Set<string>();
	const metricLineKeys = lineRows
		.map((l) => ({ itemId: l.line.itemId, unitId: l.line.unitId }))
		.filter((k) => k.itemId > 0 && k.unitId > 0)
		.filter((k) => {
			const s = `${k.itemId}:${k.unitId}`;
			if (metricLineKeysSeen.has(s)) return false;
			metricLineKeysSeen.add(s);
			return true;
		});
	let metricByKey = new Map<
		string,
		{
			pendingPrPurchaseQty: string;
			pendingPoPurchaseQty: string;
		}
	>();
	if (metricLineKeys.length > 0) {
		await assertStoreInHospital(input.hospitalId, row.pr.fromStoreId);
		const metricRows = await computePurchaseRequisitionLineMetricRows({
			hospitalId: input.hospitalId,
			fromStoreId: row.pr.fromStoreId,
			prId: input.id,
			lines: metricLineKeys
		});
		metricByKey = new Map(
			metricRows.map((r) => [
				`${r.itemId}:${r.unitId}`,
				{
					pendingPrPurchaseQty: r.pendingPrPurchaseQty,
					pendingPoPurchaseQty: r.pendingPoPurchaseQty
				}
			])
		);
	}

	const logs = await listApprovalLogs(input.hospitalId, input.id);

	const userId = event.locals.user?.id ?? null;
	const staffIdForApprove = userId ? await getStaffIdForUser(userId) : null;
	let canApprove = false;
	if (
		staffIdForApprove &&
		row.pr.statusTaggingId === InvPrStatusTaggingEnum.PENDING
	) {
		const pairs = await listPrApproverStoreLevelsForStaff(
			input.hospitalId,
			staffIdForApprove
		);
		const approverPairSet = new Set(
			pairs.map((p) => `${p.storeId}:${p.level}`)
		);
		canApprove = approverPairSet.has(
			`${row.pr.fromStoreId}:${row.pr.currentLevel}`
		);
	}

	return {
		...row.pr,
		canApprove,
		statusName: row.statusName,
		statusCode: row.statusCode,
		fromStoreName: row.fromStoreName,
		toStoreName: row.toStoreName,
		createdByName: row.createdByName ?? null,
		updatedByName: row.updatedByName ?? null,
		approvedByName: row.approvedByName ?? null,
		cancelledByName: row.cancelledByName ?? null,
		poCount,
		linkedPurchaseOrders: linkedRows.map((p) => ({
			id: p.id,
			poNo: p.poNo
		})),
		lines: lineRows.map((l) => {
			const k = `${l.line.itemId}:${l.line.unitId}`;
			const ium = iumMap.get(k);
			const met = metricByKey.get(k);
			return {
				...l.line,
				itemName: l.itemName,
				itemUnitMasterId: ium?.id ?? null,
				itemUnitMasterConversion: ium?.conversionDisplay ?? null,
				pendingPrPurchaseQty: met?.pendingPrPurchaseQty ?? '0',
				pendingPoPurchaseQty: met?.pendingPoPurchaseQty ?? '0'
			};
		}),
		logs
	};
}

export async function createPurchaseRequisition(
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
	const fromStore = await assertStoreInHospital(
		input.hospitalId,
		input.fromStoreId
	);
	const toStore = await assertStoreInHospital(
		input.hospitalId,
		input.toStoreId
	);
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

	const branchId = fromStore.branchId;
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
				fromStoreId: input.fromStoreId,
				toStoreId: input.toStoreId,
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
		fromStoreId?: number;
		toStoreId?: number;
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

	const nextFrom =
		input.fromStoreId !== undefined ? input.fromStoreId : pr.fromStoreId;
	const nextTo =
		input.toStoreId !== undefined ? input.toStoreId : pr.toStoreId;
	if (input.fromStoreId !== undefined || input.toStoreId !== undefined) {
		const fromStore = await assertStoreInHospital(
			input.hospitalId,
			nextFrom
		);
		const toStore = await assertStoreInHospital(input.hospitalId, nextTo);
	}

	await ensureDb().transaction(async (tx) => {
		if (
			input.remarks !== undefined ||
			input.fromStoreId !== undefined ||
			input.toStoreId !== undefined
		) {
			await tx
				.update(table.purchaseRequisitionTable)
				.set({
					...(input.remarks !== undefined
						? { remarks: input.remarks }
						: {}),
					...(input.fromStoreId !== undefined
						? { fromStoreId: input.fromStoreId }
						: {}),
					...(input.toStoreId !== undefined
						? { toStoreId: input.toStoreId }
						: {}),
					updatedBy: userId
				})
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
		pr.fromStoreId,
		'PR'
	);
	if (maxLevel < 1)
		throw error(400, 'Configure approval levels for this store (PR)');

	const module: InvApprovalModule = 'PR';
	await assertStaffCanApproveLevel(
		input.hospitalId,
		pr.fromStoreId,
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

/** SQL `(item_id, unit_id) IN ((…),(…))` for matching PR/PO line pairs. */
function sqlItemUnitPairsIn(
	itemColumn:
		| typeof table.purchaseRequisitionLineTable.itemId
		| typeof table.purchaseOrderLineTable.itemId,
	unitColumn:
		| typeof table.purchaseRequisitionLineTable.unitId
		| typeof table.purchaseOrderLineTable.unitId,
	pairs: readonly { itemId: number; unitId: number }[]
): SQL {
	if (pairs.length === 0) return sql`false`;
	return sql`(${itemColumn}, ${unitColumn}) IN (${sql.join(
		pairs.map((p) => sql`(${p.itemId}, ${p.unitId})`),
		sql`, `
	)})`;
}

/**
 * DB-only metrics for PR line helper UIs. Caller must enforce auth/store checks.
 * Pending PR qty: remaining qty on PR lines (qtyRemaining) for matching (item, purchase unit) from the same
 * requesting store — PR headers PENDING, SENT_BACK, or APPROVED (includes current PR).
 * Pending PO qty: remaining qty to receive on PR-backed PO lines (quantity - qtyReceivedCumulative), for the same
 * requesting store — PO headers in-flight or approved (includes POs linked to current PR).
 */
async function computePurchaseRequisitionLineMetricRows(input: {
	hospitalId: string;
	fromStoreId: number;
	prId?: string | null;
	lines: { itemId: number; unitId: number }[];
}): Promise<
	Array<{
		itemId: number;
		unitId: number;
		storeStockIssueQty: string;
		globalStockIssueQty: string;
		pendingPrPurchaseQty: string;
		pendingPoPurchaseQty: string;
		currentPrPurchaseQty: string;
	}>
> {
	const keys = input.lines.map((l) => ({ itemId: l.itemId, unitId: l.unitId }));
	const itemIdSet = [...new Set(keys.map((k) => k.itemId))];

	const storeStockCond = and(
		eq(table.invStockTable.hospitalId, input.hospitalId),
		isNull(table.invStockTable.deletedAt),
		eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
		eq(table.invStockTable.storeId, input.fromStoreId),
		sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`,
		inArray(table.invStockTable.itemId, itemIdSet)
	);
	const globalStockCond = and(
		eq(table.invStockTable.hospitalId, input.hospitalId),
		isNull(table.invStockTable.deletedAt),
		eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
		sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`,
		inArray(table.invStockTable.itemId, itemIdSet)
	);

	const prPairCond = sqlItemUnitPairsIn(
		table.purchaseRequisitionLineTable.itemId,
		table.purchaseRequisitionLineTable.unitId,
		keys
	);
	const poPairCond = sqlItemUnitPairsIn(
		table.purchaseOrderLineTable.itemId,
		table.purchaseOrderLineTable.unitId,
		keys
	);

	const [storeRows, globalRows, pendingPrRows, pendingPoRows, currentRows] =
		await Promise.all([
			ensureDb()
				.select({
					itemId: table.invStockTable.itemId,
					qty: sql<string>`coalesce(sum(${table.invStockTable.quantity}::numeric), 0)::text`
				})
				.from(table.invStockTable)
				.innerJoin(
					table.storeTable,
					eq(table.invStockTable.storeId, table.storeTable.id)
				)
				.innerJoin(
					table.hospitalBranchTable,
					eq(table.storeTable.branchId, table.hospitalBranchTable.id)
				)
				.where(storeStockCond)
				.groupBy(table.invStockTable.itemId),
			ensureDb()
				.select({
					itemId: table.invStockTable.itemId,
					qty: sql<string>`coalesce(sum(${table.invStockTable.quantity}::numeric), 0)::text`
				})
				.from(table.invStockTable)
				.innerJoin(
					table.storeTable,
					eq(table.invStockTable.storeId, table.storeTable.id)
				)
				.innerJoin(
					table.hospitalBranchTable,
					eq(table.storeTable.branchId, table.hospitalBranchTable.id)
				)
				.where(globalStockCond)
				.groupBy(table.invStockTable.itemId),
			ensureDb()
				.select({
					itemId: table.purchaseRequisitionLineTable.itemId,
					unitId: table.purchaseRequisitionLineTable.unitId,
					pending: sql<string>`coalesce(sum(${table.purchaseRequisitionLineTable.qtyRemaining}::numeric), 0)::text`
				})
				.from(table.purchaseRequisitionLineTable)
				.innerJoin(
					table.purchaseRequisitionTable,
					eq(
						table.purchaseRequisitionLineTable.prId,
						table.purchaseRequisitionTable.id
					)
				)
				.where(
					and(
						eq(
							table.purchaseRequisitionTable.hospitalId,
							input.hospitalId
						),
						eq(
							table.purchaseRequisitionTable.fromStoreId,
							input.fromStoreId
						),
						isNull(table.purchaseRequisitionTable.deletedAt),
						isNull(table.purchaseRequisitionLineTable.deletedAt),
						inArray(
							table.purchaseRequisitionTable.statusTaggingId,
							[
								InvPrStatusTaggingEnum.PENDING,
								InvPrStatusTaggingEnum.SENT_BACK,
								InvPrStatusTaggingEnum.APPROVED
							]
						),
						prPairCond
					)
				)
				.groupBy(
					table.purchaseRequisitionLineTable.itemId,
					table.purchaseRequisitionLineTable.unitId
				),
			ensureDb()
				.select({
					itemId: table.purchaseOrderLineTable.itemId,
					unitId: table.purchaseOrderLineTable.unitId,
					pendingPo: sql<string>`coalesce(sum(greatest((${table.purchaseOrderLineTable.quantity}::numeric - ${table.purchaseOrderLineTable.qtyReceivedCumulative}::numeric), 0)), 0)::text`
				})
				.from(table.purchaseOrderLineTable)
				.innerJoin(
					table.purchaseOrderTable,
					eq(
						table.purchaseOrderLineTable.poId,
						table.purchaseOrderTable.id
					)
				)
				.innerJoin(
					table.purchaseRequisitionTable,
					eq(
						table.purchaseOrderTable.prId,
						table.purchaseRequisitionTable.id
					)
				)
				.where(
					and(
						eq(table.purchaseOrderTable.hospitalId, input.hospitalId),
						eq(
							table.purchaseRequisitionTable.fromStoreId,
							input.fromStoreId
						),
						isNull(table.purchaseOrderTable.deletedAt),
						isNull(table.purchaseOrderLineTable.deletedAt),
						isNull(table.purchaseRequisitionTable.deletedAt),
						inArray(table.purchaseOrderTable.statusTaggingId, [
							InvPoStatusTaggingEnum.PENDING,
							InvPoStatusTaggingEnum.SENT_BACK,
							InvPoStatusTaggingEnum.APPROVED,
							InvPoStatusTaggingEnum.SENT_TO_SUPPLIER,
							InvPoStatusTaggingEnum.PARTIALLY_RECEIVED
						]),
						poPairCond
					)
				)
				.groupBy(
					table.purchaseOrderLineTable.itemId,
					table.purchaseOrderLineTable.unitId
				),
			input.prId
				? ensureDb()
						.select({
							itemId: table.purchaseRequisitionLineTable.itemId,
							unitId: table.purchaseRequisitionLineTable.unitId,
							cur: sql<string>`coalesce(sum(${table.purchaseRequisitionLineTable.quantity}::numeric), 0)::text`
						})
						.from(table.purchaseRequisitionLineTable)
						.where(
							and(
								eq(
									table.purchaseRequisitionLineTable.prId,
									input.prId
								),
								isNull(table.purchaseRequisitionLineTable.deletedAt),
								inArray(
									table.purchaseRequisitionLineTable.itemId,
									itemIdSet
								)
							)
						)
						.groupBy(
							table.purchaseRequisitionLineTable.itemId,
							table.purchaseRequisitionLineTable.unitId
						)
				: Promise.resolve(
						[] as {
							itemId: number;
							unitId: number;
							cur: string;
						}[]
					)
		]);

	const storeMap = new Map(storeRows.map((r) => [r.itemId, r.qty]));
	const globalMap = new Map(globalRows.map((r) => [r.itemId, r.qty]));
	const pendKey = (itemId: number, unitId: number) => `${itemId}:${unitId}`;
	const pendingPrMap = new Map(
		pendingPrRows.map((r) => [pendKey(r.itemId, r.unitId), r.pending])
	);
	const pendingPoMap = new Map(
		pendingPoRows.map((r) => [pendKey(r.itemId, r.unitId), r.pendingPo])
	);
	const currentMap = new Map(
		currentRows.map((r) => [pendKey(r.itemId, r.unitId), r.cur])
	);

	return keys.map((k) => ({
		itemId: k.itemId,
		unitId: k.unitId,
		storeStockIssueQty: storeMap.get(k.itemId) ?? '0',
		globalStockIssueQty: globalMap.get(k.itemId) ?? '0',
		pendingPrPurchaseQty:
			pendingPrMap.get(pendKey(k.itemId, k.unitId)) ?? '0',
		pendingPoPurchaseQty:
			pendingPoMap.get(pendKey(k.itemId, k.unitId)) ?? '0',
		currentPrPurchaseQty: input.prId
			? (currentMap.get(pendKey(k.itemId, k.unitId)) ?? '0')
			: '0'
	}));
}

export async function getPurchaseRequisitionLineMetrics(
	event: RequestEvent,
	input: {
		hospitalId: string;
		fromStoreId: number;
		prId?: string | null;
		lines: { itemId: number; unitId: number }[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const keys = input.lines
		.map((l) => ({ itemId: l.itemId, unitId: l.unitId }))
		.filter((l) => l.itemId > 0 && l.unitId > 0);
	if (keys.length === 0) return { rows: [] as const };
	await assertStoreInHospital(input.hospitalId, input.fromStoreId);

	const rows = await computePurchaseRequisitionLineMetricRows({
		hospitalId: input.hospitalId,
		fromStoreId: input.fromStoreId,
		prId: input.prId ?? null,
		lines: keys
	});

	return { rows };
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

export async function closePurchaseRequisitionLineRemaining(
	event: RequestEvent,
	input: { hospitalId: string; prId: string; lineId: number }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');

	const lineId = Number(input.lineId);
	if (!Number.isFinite(lineId) || lineId <= 0) throw error(400, 'Invalid line id');

	await ensureDb().transaction(async (tx) => {
		const [pr] = await tx
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
			throw error(400, 'Cannot close line: PR is cancelled');
		}

		const [ln] = await tx
			.select()
			.from(table.purchaseRequisitionLineTable)
			.where(
				and(
					eq(table.purchaseRequisitionLineTable.id, lineId),
					eq(table.purchaseRequisitionLineTable.prId, input.prId),
					isNull(table.purchaseRequisitionLineTable.deletedAt)
				)
			)
			.limit(1);
		if (!ln) throw error(404, 'PR line not found');

		const rem = Number(ln.qtyRemaining);
		if (!Number.isFinite(rem)) throw error(400, 'Invalid remaining quantity');
		if (rem <= 0) return; // already closed / fully allocated

		await tx
			.update(table.purchaseRequisitionLineTable)
			.set({
				qtyRemaining: '0',
				updatedBy: userId
			})
			.where(eq(table.purchaseRequisitionLineTable.id, lineId));
	});

	return getPurchaseRequisitionById(event, { hospitalId: input.hospitalId, id: input.prId });
}
