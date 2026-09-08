import { error, type RequestEvent } from '@sveltejs/kit';
import {
	and,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	sql
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	InvApprovalActionEnum,
	InvPoStatusTaggingEnum,
	InvPrStatusTaggingEnum
} from '$lib/model/enum/db-link';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { generatePrefix } from '$lib/server/medora/prefix/prefix-generator.server';
import {
	assertStaffCanApproveLevel,
	getMaxApprovalLevel,
	listApprovalLogs,
	listPoApproverStoreLevelsForStaff
} from './approval-workflow.server';
import {
	assertStoreInHospital,
	ensureHospitalInventoryAccess,
	getStaffIdForUser
} from './inventory-scope.server';
import type { InvApprovalModule } from './approval-config.server';
import { resolveItemUnitMastersByItemAndPurchaseUnit } from '$lib/server/medora/administration/item-master.server';
import { resolveItemUnitMasterForItemPurchaseUnit } from './item-unit-inventory.server';

export async function listPurchaseOrders(
	event: RequestEvent,
	input: {
		hospitalId: string;
		page?: number;
		pageSize?: number;
		prId?: string;
		/** When set, only POs for this store (e.g. navbar-selected inventory store; CPS for PR/PO). */
		storeId?: number;
		supplierId?: number;
		statusTaggingId?: number;
		poNo?: string;
		/** Substring match against total_amount (cast to text). */
		totalAmount?: string;
		/** Substring match against any PO line item name. */
		item?: string;
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const { page, pageSize, limit, offset } =
		normalizePagination(input);

	let cond = and(
		eq(table.purchaseOrderTable.hospitalId, input.hospitalId),
		isNull(table.purchaseOrderTable.deletedAt)
	);
	if (input.prId) {
		cond = and(cond, eq(table.purchaseOrderTable.prId, input.prId))!;
	}
	if (input.storeId != null) {
		cond = and(
			cond,
			eq(table.purchaseOrderTable.storeId, input.storeId)
		)!;
	}
	if (typeof input.supplierId === 'number') {
		cond = and(
			cond,
			eq(table.purchaseOrderTable.supplierId, input.supplierId)
		)!;
	}
	if (typeof input.statusTaggingId === 'number') {
		cond = and(
			cond,
			eq(
				table.purchaseOrderTable.statusTaggingId,
				input.statusTaggingId
			)
		)!;
	}
	const poNoTerm = input.poNo?.trim();
	if (poNoTerm) {
		const safe = poNoTerm.replace(/[%_\\]/g, '');
		if (safe) {
			cond = and(
				cond,
				ilike(table.purchaseOrderTable.poNo, `%${safe}%`)
			)!;
		}
	}
	const totalTerm = input.totalAmount?.trim();
	if (totalTerm) {
		const safe = totalTerm.replace(/[%_\\]/g, '');
		if (safe) {
			cond = and(
				cond,
				ilike(
					sql`${table.purchaseOrderTable.totalAmount}::text`,
					`%${safe}%`
				)
			)!;
		}
	}
	const itemTerm = input.item?.trim();
	if (itemTerm) {
		const safe = itemTerm.replace(/[%_\\]/g, '');
		if (safe) {
			cond = and(
				cond,
				sql`exists (
					select 1
					from ${table.purchaseOrderLineTable} pol
					inner join ${table.itemMasterTable} im
						on pol.item_id = im.id
					where pol.po_id = ${table.purchaseOrderTable.id}
						and im.item_name ilike ${`%${safe}%`}
				)`
			)!;
		}
	}

	const uCreated = alias(table.userTable, 'po_created_by_user');
	const uUpdated = alias(table.userTable, 'po_updated_by_user');
	const uApproved = alias(table.userTable, 'po_approved_by_user');

	const [data, cnt] = await Promise.all([
		ensureDb()
			.select({
				po: table.purchaseOrderTable,
				statusName: table.statusTaggingTable.name,
				supplierName: table.supplierTable.name,
				storeName: table.storeTable.storeName,
				createdByName: uCreated.name,
				updatedByName: uUpdated.name,
				approvedByName: uApproved.name
			})
			.from(table.purchaseOrderTable)
			.innerJoin(
				table.statusTaggingTable,
				eq(
					table.purchaseOrderTable.statusTaggingId,
					table.statusTaggingTable.id
				)
			)
			.innerJoin(
				table.storeTable,
				eq(table.purchaseOrderTable.storeId, table.storeTable.id)
			)
			.innerJoin(
				table.supplierTable,
				eq(
					table.purchaseOrderTable.supplierId,
					table.supplierTable.id
				)
			)
			.leftJoin(
				uCreated,
				eq(table.purchaseOrderTable.createdBy, uCreated.id)
			)
			.leftJoin(
				uUpdated,
				eq(table.purchaseOrderTable.updatedBy, uUpdated.id)
			)
			.leftJoin(
				uApproved,
				eq(table.purchaseOrderTable.approvedBy, uApproved.id)
			)
			.where(cond)
			.orderBy(desc(table.purchaseOrderTable.createdAt))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ c: count() })
			.from(table.purchaseOrderTable)
			.where(cond)
	]);

	const total = cnt[0]?.c ?? 0;

	const userId = event.locals.user?.id ?? null;
	const staffId = userId ? await getStaffIdForUser(userId) : null;
	let approverPairSet = new Set<string>();
	if (staffId) {
		const pairs = await listPoApproverStoreLevelsForStaff(
			input.hospitalId,
			staffId
		);
		approverPairSet = new Set(
			pairs.map((p) => `${p.storeId}:${p.level}`)
		);
	}

	const poIds = data.map((r) => r.po.id);
	const itemNamesByPo = new Map<string, string>();
	if (poIds.length > 0) {
		const rows = await ensureDb()
			.select({
				poId: table.purchaseOrderLineTable.poId,
				itemNames: sql<string>`string_agg(distinct ${table.itemMasterTable.itemName}, ', ')`
			})
			.from(table.purchaseOrderLineTable)
			.innerJoin(
				table.itemMasterTable,
				eq(
					table.purchaseOrderLineTable.itemId,
					table.itemMasterTable.id
				)
			)
			.where(inArray(table.purchaseOrderLineTable.poId, poIds))
			.groupBy(table.purchaseOrderLineTable.poId);
		for (const r of rows) {
			if (r.poId) itemNamesByPo.set(r.poId, r.itemNames ?? '');
		}
	}

	return {
		data: data.map((r) => ({
			...r.po,
			statusName: r.statusName,
			supplierName: r.supplierName,
			storeName: r.storeName,
			createdByName: r.createdByName ?? null,
			updatedByName: r.updatedByName ?? null,
			approvedByName: r.approvedByName ?? null,
			itemNames: itemNamesByPo.get(r.po.id) ?? '',
			canApprove:
				r.po.statusTaggingId === InvPoStatusTaggingEnum.PENDING &&
				approverPairSet.has(`${r.po.storeId}:${r.po.currentLevel}`)
		})),
		total,
		page,
		pageSize,
		totalPages: Math.ceil(Number(total) / pageSize) || 1
	};
}

export async function getPurchaseOrderById(
	event: RequestEvent,
	input: { hospitalId: string; id: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const uCreated = alias(
		table.userTable,
		'po_detail_created_by_user'
	);
	const uUpdated = alias(
		table.userTable,
		'po_detail_updated_by_user'
	);
	const uApproved = alias(
		table.userTable,
		'po_detail_approved_by_user'
	);
	const prLinked = alias(
		table.purchaseRequisitionTable,
		'po_detail_linked_pr'
	);

	const [row] = await ensureDb()
		.select({
			po: table.purchaseOrderTable,
			statusName: table.statusTaggingTable.name,
			supplierName: table.supplierTable.name,
			storeName: table.storeTable.storeName,
			createdByName: uCreated.name,
			updatedByName: uUpdated.name,
			approvedByName: uApproved.name,
			linkedRequisitionNo: prLinked.prNo
		})
		.from(table.purchaseOrderTable)
		.innerJoin(
			table.statusTaggingTable,
			eq(
				table.purchaseOrderTable.statusTaggingId,
				table.statusTaggingTable.id
			)
		)
		.innerJoin(
			table.storeTable,
			eq(table.purchaseOrderTable.storeId, table.storeTable.id)
		)
		.innerJoin(
			table.supplierTable,
			eq(table.purchaseOrderTable.supplierId, table.supplierTable.id)
		)
		.leftJoin(
			uCreated,
			eq(table.purchaseOrderTable.createdBy, uCreated.id)
		)
		.leftJoin(
			uUpdated,
			eq(table.purchaseOrderTable.updatedBy, uUpdated.id)
		)
		.leftJoin(
			uApproved,
			eq(table.purchaseOrderTable.approvedBy, uApproved.id)
		)
		.leftJoin(
			prLinked,
			and(
				eq(table.purchaseOrderTable.prId, prLinked.id),
				isNull(prLinked.deletedAt)
			)
		)
		.where(
			and(
				eq(table.purchaseOrderTable.id, input.id),
				eq(table.purchaseOrderTable.hospitalId, input.hospitalId),
				isNull(table.purchaseOrderTable.deletedAt)
			)
		)
		.limit(1);
	if (!row) return null;

	const lineRows = await ensureDb()
		.select({
			line: table.purchaseOrderLineTable,
			itemName: table.itemMasterTable.itemName
		})
		.from(table.purchaseOrderLineTable)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.purchaseOrderLineTable.itemId,
				table.itemMasterTable.id
			)
		)
		.where(
			and(
				eq(table.purchaseOrderLineTable.poId, input.id),
				isNull(table.purchaseOrderLineTable.deletedAt)
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

	const userId = event.locals.user?.id ?? null;
	const staffIdForApprove = userId
		? await getStaffIdForUser(userId)
		: null;
	let canApprove = false;
	if (
		staffIdForApprove &&
		row.po.statusTaggingId === InvPoStatusTaggingEnum.PENDING
	) {
		const pairs = await listPoApproverStoreLevelsForStaff(
			input.hospitalId,
			staffIdForApprove
		);
		const approverPairSet = new Set(
			pairs.map((p) => `${p.storeId}:${p.level}`)
		);
		canApprove = approverPairSet.has(
			`${row.po.storeId}:${row.po.currentLevel}`
		);
	}

	return {
		...row.po,
		canApprove,
		statusName: row.statusName,
		supplierName: row.supplierName,
		storeName: row.storeName,
		createdByName: row.createdByName ?? null,
		updatedByName: row.updatedByName ?? null,
		approvedByName: row.approvedByName ?? null,
		linkedRequisitionNo: row.linkedRequisitionNo ?? null,
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

export async function createPurchaseOrder(
	event: RequestEvent,
	input: {
		hospitalId: string;
		/** Store selected in top bar; must match PR `toStoreId` (receiver) for PR-backed PO. */
		storeId: number;
		prId: string;
		supplierId: number;
		lines: {
			prLineId: number;
			itemId: number;
			quantity: string;
			unitId: number;
			unitPrice: string;
		}[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	if (input.lines.length === 0)
		throw error(400, 'At least one line required');
	if (!Number.isFinite(input.storeId) || input.storeId <= 0) {
		throw error(400, 'Store is required');
	}

	const [pr] = await ensureDb()
		.select()
		.from(table.purchaseRequisitionTable)
		.where(
			and(
				eq(table.purchaseRequisitionTable.id, input.prId),
				eq(
					table.purchaseRequisitionTable.hospitalId,
					input.hospitalId
				),
				isNull(table.purchaseRequisitionTable.deletedAt)
			)
		)
		.limit(1);
	if (!pr) throw error(404, 'PR not found');
	if (pr.statusTaggingId !== InvPrStatusTaggingEnum.APPROVED) {
		throw error(400, 'PR must be approved before creating a PO');
	}

	const [prefixRow] = await ensureDb()
		.select({ id: table.prefixFormatTable.id })
		.from(table.prefixFormatTable)
		.where(
			and(
				eq(table.prefixFormatTable.hospitalId, input.hospitalId),
				eq(
					table.prefixFormatTable.key,
					PREFIX_PURPOSE_STORAGE.PURCHASE_ORDER_NO
				),
				isNull(table.prefixFormatTable.deletedAt)
			)
		)
		.limit(1);
	if (!prefixRow) {
		throw error(
			400,
			'Unable to generate PO No (PURCHASE_ORDER_NO). Configure it in Prefix Configuration.'
		);
	}

	/** PO is owned by the PR’s *to* store (receiver), not the requesting (from) store. */
	const poStoreId = pr.toStoreId;
	if (input.storeId !== poStoreId) {
		throw error(
			400,
			'Purchase order must be created by the PR receiving store'
		);
	}
	const store = await assertStoreInHospital(
		input.hospitalId,
		poStoreId
	);
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
		throw error(
			400,
			'Financial year is not configured for this hospital.'
		);
	}

	let poNo: string;
	try {
		poNo = await generatePrefix({
			hospitalId: input.hospitalId,
			branchId,
			financialYearId: financialYear.id,
			prefixKey: PREFIX_PURPOSE_STORAGE.PURCHASE_ORDER_NO,
			context: {}
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		throw error(
			400,
			`Unable to generate PO No (PURCHASE_ORDER_NO). Configure it in Prefix Configuration. (${msg})`
		);
	}

	const poId = await ensureDb().transaction(async (tx) => {
		let total = 0;
		const lineRows: Array<{
			prLineId: number;
			itemId: number;
			quantity: string;
			unitId: number;
			unitPrice: string;
			lineTotal: string;
			createdBy: string;
			updatedBy: string;
		}> = [];

		for (const l of input.lines) {
			const [prLine] = await tx
				.select()
				.from(table.purchaseRequisitionLineTable)
				.where(
					and(
						eq(table.purchaseRequisitionLineTable.id, l.prLineId),
						eq(table.purchaseRequisitionLineTable.prId, input.prId),
						isNull(table.purchaseRequisitionLineTable.deletedAt)
					)
				)
				.limit(1);
			if (!prLine) throw error(400, `Invalid PR line ${l.prLineId}`);
			const qty = Number(l.quantity);
			const price = Number(l.unitPrice);
			if (!Number.isFinite(qty) || qty <= 0)
				throw error(400, 'Invalid quantity');
			if (!Number.isFinite(price) || price <= 0)
				throw error(400, 'Invalid price');
			const rem = Number(prLine.qtyRemaining);
			if (qty > rem)
				throw error(400, 'Quantity exceeds remaining on PR line');

			const lineTotal = (qty * price).toFixed(2);
			total += qty * price;

			lineRows.push({
				prLineId: l.prLineId,
				itemId: l.itemId,
				quantity: l.quantity,
				unitId: l.unitId,
				unitPrice: l.unitPrice,
				lineTotal,
				createdBy: userId,
				updatedBy: userId
			});
		}

		const [po] = await tx
			.insert(table.purchaseOrderTable)
			.values({
				poNo,
				hospitalId: input.hospitalId,
				prId: input.prId,
				storeId: poStoreId,
				supplierId: input.supplierId,
				statusTaggingId: InvPoStatusTaggingEnum.PENDING,
				currentLevel: 1,
				totalAmount: total.toFixed(2),
				createdBy: userId,
				updatedBy: userId
			})
			.returning({ id: table.purchaseOrderTable.id });
		if (!po) throw error(500, 'PO insert failed');

		await tx
			.insert(table.purchaseOrderLineTable)
			.values(lineRows.map((r) => ({ ...r, poId: po.id })));

		for (const l of input.lines) {
			const [pln] = await tx
				.select()
				.from(table.purchaseRequisitionLineTable)
				.where(eq(table.purchaseRequisitionLineTable.id, l.prLineId))
				.limit(1);
			if (!pln) throw error(500, 'PR line missing');
			const orderedQty = Number(l.quantity);
			if (!Number.isInteger(orderedQty) || orderedQty <= 0) {
				throw error(400, 'Quantity must be an integer');
			}
			const prevRem = Number(pln.qtyRemaining);
			if (!Number.isInteger(prevRem)) {
				throw error(400, 'PR remaining quantity must be an integer');
			}
			const newRem = String(prevRem - orderedQty);
			await tx
				.update(table.purchaseRequisitionLineTable)
				.set({
					qtyRemaining: newRem,
					updatedBy: userId
				})
				.where(eq(table.purchaseRequisitionLineTable.id, l.prLineId));
		}

		return po.id;
	});

	return getPurchaseOrderById(event, {
		hospitalId: input.hospitalId,
		id: poId
	});
}

export async function createPurchaseOrderDirect(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId: number;
		supplierId: number;
		lines: {
			itemId: number;
			quantity: string;
			unitId: number;
			unitPrice: string;
		}[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	if (input.lines.length === 0)
		throw error(400, 'At least one line required');

	for (const l of input.lines) {
		await resolveItemUnitMasterForItemPurchaseUnit({
			hospitalId: input.hospitalId,
			itemId: l.itemId,
			purchaseUnitId: l.unitId
		});
	}

	const [prefixRow] = await ensureDb()
		.select({ id: table.prefixFormatTable.id })
		.from(table.prefixFormatTable)
		.where(
			and(
				eq(table.prefixFormatTable.hospitalId, input.hospitalId),
				eq(
					table.prefixFormatTable.key,
					PREFIX_PURPOSE_STORAGE.PURCHASE_ORDER_NO
				),
				isNull(table.prefixFormatTable.deletedAt)
			)
		)
		.limit(1);
	if (!prefixRow) {
		throw error(
			400,
			'Unable to generate PO No (PURCHASE_ORDER_NO). Configure it in Prefix Configuration.'
		);
	}

	const store = await assertStoreInHospital(
		input.hospitalId,
		input.storeId
	);
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
		throw error(
			400,
			'Financial year is not configured for this hospital.'
		);
	}

	let poNo: string;
	try {
		poNo = await generatePrefix({
			hospitalId: input.hospitalId,
			branchId,
			financialYearId: financialYear.id,
			prefixKey: PREFIX_PURPOSE_STORAGE.PURCHASE_ORDER_NO,
			context: {}
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		throw error(
			400,
			`Unable to generate PO No (PURCHASE_ORDER_NO). Configure it in Prefix Configuration. (${msg})`
		);
	}

	const poId = await ensureDb().transaction(async (tx) => {
		let total = 0;
		const lineRows: Array<{
			prLineId: null;
			itemId: number;
			quantity: string;
			unitId: number;
			unitPrice: string;
			lineTotal: string;
			createdBy: string;
			updatedBy: string;
		}> = [];

		for (const l of input.lines) {
			const qty = Number(l.quantity);
			const price = Number(l.unitPrice);
			if (!Number.isFinite(qty) || qty <= 0) {
				throw error(400, 'Invalid quantity');
			}
			if (!Number.isFinite(price) || price <= 0) {
				throw error(400, 'Invalid price');
			}
			const lineTotal = (qty * price).toFixed(2);
			total += qty * price;
			lineRows.push({
				prLineId: null,
				itemId: l.itemId,
				quantity: l.quantity,
				unitId: l.unitId,
				unitPrice: l.unitPrice,
				lineTotal,
				createdBy: userId,
				updatedBy: userId
			});
		}

		const [po] = await tx
			.insert(table.purchaseOrderTable)
			.values({
				poNo,
				hospitalId: input.hospitalId,
				prId: null,
				storeId: input.storeId,
				supplierId: input.supplierId,
				statusTaggingId: InvPoStatusTaggingEnum.PENDING,
				currentLevel: 1,
				totalAmount: total.toFixed(2),
				createdBy: userId,
				updatedBy: userId
			})
			.returning({ id: table.purchaseOrderTable.id });
		if (!po) throw error(500, 'PO insert failed');

		await tx
			.insert(table.purchaseOrderLineTable)
			.values(lineRows.map((r) => ({ ...r, poId: po.id })));
		return po.id;
	});

	return getPurchaseOrderById(event, {
		hospitalId: input.hospitalId,
		id: poId
	});
}

export async function approvePurchaseOrder(
	event: RequestEvent,
	input: {
		hospitalId: string;
		poId: string;
		action: number;
		remarks: string | null;
		lineAdjustments?: {
			lineId: number;
			quantity: string;
			unitPrice?: string;
		}[];
	}
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');
	const staffId = await getStaffIdForUser(userId);
	if (!staffId) throw error(403, 'Staff profile required');

	const [po] = await ensureDb()
		.select()
		.from(table.purchaseOrderTable)
		.where(
			and(
				eq(table.purchaseOrderTable.id, input.poId),
				eq(table.purchaseOrderTable.hospitalId, input.hospitalId),
				isNull(table.purchaseOrderTable.deletedAt)
			)
		)
		.limit(1);
	if (!po) throw error(404, 'PO not found');
	if (po.statusTaggingId !== InvPoStatusTaggingEnum.PENDING) {
		throw error(400, 'PO is not awaiting approval');
	}

	const maxLevel = await getMaxApprovalLevel(
		input.hospitalId,
		po.storeId,
		'PO'
	);
	if (maxLevel < 1) {
		throw error(400, 'Configure approval levels for this store (PO)');
	}

	const module: InvApprovalModule = 'PO';
	await assertStaffCanApproveLevel(
		input.hospitalId,
		po.storeId,
		module,
		po.currentLevel,
		staffId
	);

	await ensureDb().transaction(async (tx) => {
		if (
			input.action === InvApprovalActionEnum.APPROVED &&
			input.lineAdjustments?.length
		) {
			let total = 0;
			for (const adj of input.lineAdjustments) {
				const [ln] = await tx
					.select()
					.from(table.purchaseOrderLineTable)
					.where(
						and(
							eq(table.purchaseOrderLineTable.id, adj.lineId),
							eq(table.purchaseOrderLineTable.poId, input.poId),
							isNull(table.purchaseOrderLineTable.deletedAt)
						)
					)
					.limit(1);
				if (!ln) throw error(400, `Invalid PO line ${adj.lineId}`);
				const qty = Number(adj.quantity);
				const price = Number(
					adj.unitPrice !== undefined ? adj.unitPrice : ln.unitPrice
				);
				if (!Number.isFinite(qty) || qty <= 0)
					throw error(400, 'Invalid quantity');
				if (!Number.isFinite(price) || price < 0)
					throw error(400, 'Invalid price');
				const lineTotal = (qty * price).toFixed(2);
				total += qty * price;
				await tx
					.update(table.purchaseOrderLineTable)
					.set({
						quantity: adj.quantity,
						unitPrice: String(price),
						lineTotal,
						updatedBy: userId
					})
					.where(eq(table.purchaseOrderLineTable.id, adj.lineId));
			}
			await tx
				.update(table.purchaseOrderTable)
				.set({
					totalAmount: total.toFixed(2),
					updatedBy: userId
				})
				.where(eq(table.purchaseOrderTable.id, input.poId));
		}

		if (input.action === InvApprovalActionEnum.REJECTED) {
			await tx
				.update(table.purchaseOrderTable)
				.set({
					statusTaggingId: InvPoStatusTaggingEnum.REJECTED,
					updatedBy: userId
				})
				.where(eq(table.purchaseOrderTable.id, input.poId));
		} else if (input.action === InvApprovalActionEnum.SENT_BACK) {
			await tx
				.update(table.purchaseOrderTable)
				.set({
					statusTaggingId: InvPoStatusTaggingEnum.SENT_BACK,
					currentLevel: 1,
					updatedBy: userId
				})
				.where(eq(table.purchaseOrderTable.id, input.poId));
		} else if (input.action === InvApprovalActionEnum.APPROVED) {
			if (po.currentLevel < maxLevel) {
				await tx
					.update(table.purchaseOrderTable)
					.set({
						currentLevel: po.currentLevel + 1,
						updatedBy: userId
					})
					.where(eq(table.purchaseOrderTable.id, input.poId));
			} else {
				await tx
					.update(table.purchaseOrderTable)
					.set({
						statusTaggingId: InvPoStatusTaggingEnum.APPROVED,
						updatedBy: userId,
						approvedBy: userId,
						approvedAt: sql<string>`now()`
					})
					.where(eq(table.purchaseOrderTable.id, input.poId));
			}
		}

		await tx.insert(table.invApprovalLogTable).values({
			hospitalId: input.hospitalId,
			documentId: input.poId,
			module: 'PO',
			level: po.currentLevel,
			action: input.action,
			remarks: input.remarks,
			approvedBy: userId,
			lineAdjustments: input.lineAdjustments ?? null
		});
	});

	return getPurchaseOrderById(event, {
		hospitalId: input.hospitalId,
		id: input.poId
	});
}

export async function sendPurchaseOrderToSupplier(
	event: RequestEvent,
	input: { hospitalId: string; poId: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');

	const [po] = await ensureDb()
		.select()
		.from(table.purchaseOrderTable)
		.where(
			and(
				eq(table.purchaseOrderTable.id, input.poId),
				eq(table.purchaseOrderTable.hospitalId, input.hospitalId),
				isNull(table.purchaseOrderTable.deletedAt)
			)
		)
		.limit(1);
	if (!po) throw error(404, 'PO not found');
	if (po.statusTaggingId !== InvPoStatusTaggingEnum.APPROVED) {
		throw error(
			400,
			'PO must be approved before sending to supplier'
		);
	}

	await ensureDb()
		.update(table.purchaseOrderTable)
		.set({
			statusTaggingId: InvPoStatusTaggingEnum.SENT_TO_SUPPLIER,
			sentToSupplierAt: sql`now()`,
			updatedBy: userId
		})
		.where(eq(table.purchaseOrderTable.id, input.poId));

	return getPurchaseOrderById(event, {
		hospitalId: input.hospitalId,
		id: input.poId
	});
}

export async function resubmitPurchaseOrder(
	event: RequestEvent,
	input: { hospitalId: string; poId: string }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');

	const [po] = await ensureDb()
		.select()
		.from(table.purchaseOrderTable)
		.where(
			and(
				eq(table.purchaseOrderTable.id, input.poId),
				eq(table.purchaseOrderTable.hospitalId, input.hospitalId),
				isNull(table.purchaseOrderTable.deletedAt)
			)
		)
		.limit(1);
	if (!po) throw error(404, 'PO not found');
	if (
		po.statusTaggingId !== InvPoStatusTaggingEnum.SENT_BACK &&
		po.statusTaggingId !== InvPoStatusTaggingEnum.REJECTED
	) {
		throw error(400, 'PO cannot be resubmitted from this status');
	}

	await ensureDb()
		.update(table.purchaseOrderTable)
		.set({
			statusTaggingId: InvPoStatusTaggingEnum.PENDING,
			currentLevel: 1,
			updatedBy: userId
		})
		.where(eq(table.purchaseOrderTable.id, input.poId));

	return getPurchaseOrderById(event, {
		hospitalId: input.hospitalId,
		id: input.poId
	});
}

export async function closePurchaseOrderLineRemaining(
	event: RequestEvent,
	input: { hospitalId: string; poId: string; lineId: number }
) {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	const userId = event.locals.user?.id;
	if (!userId) throw error(401, 'Unauthorized');

	const lineId = Number(input.lineId);
	if (!Number.isFinite(lineId) || lineId <= 0) {
		throw error(400, 'Invalid line id');
	}

	await ensureDb().transaction(async (tx) => {
		const [po] = await tx
			.select()
			.from(table.purchaseOrderTable)
			.where(
				and(
					eq(table.purchaseOrderTable.id, input.poId),
					eq(table.purchaseOrderTable.hospitalId, input.hospitalId),
					isNull(table.purchaseOrderTable.deletedAt)
				)
			)
			.limit(1);
		if (!po) throw error(404, 'PO not found');

		// Only allow when PO is beyond approvals (or in-flight). Closing is about remaining receipt.
		if (
			po.statusTaggingId === InvPoStatusTaggingEnum.DRAFT ||
			po.statusTaggingId === InvPoStatusTaggingEnum.REJECTED ||
			po.statusTaggingId === InvPoStatusTaggingEnum.SENT_BACK
		) {
			throw error(400, 'Cannot close line in current PO status');
		}

		const [ln] = await tx
			.select()
			.from(table.purchaseOrderLineTable)
			.where(
				and(
					eq(table.purchaseOrderLineTable.id, lineId),
					eq(table.purchaseOrderLineTable.poId, input.poId),
					isNull(table.purchaseOrderLineTable.deletedAt)
				)
			)
			.limit(1);
		if (!ln) throw error(404, 'PO line not found');

		const ordered = Number(ln.quantity);
		const received = Number(ln.qtyReceivedCumulative);
		if (!Number.isFinite(ordered) || !Number.isFinite(received)) {
			throw error(400, 'Invalid line quantity state');
		}
		if (received >= ordered) return; // already fully received (or closed previously)

		if (!Number.isInteger(received)) {
			throw error(400, 'Received quantity must be an integer');
		}
		const newQty = String(received);
		const unitPrice = Number(ln.unitPrice);
		if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
			throw error(400, 'Invalid unit price');
		}
		const newLineTotal = (received * unitPrice).toFixed(2);

		await tx
			.update(table.purchaseOrderLineTable)
			.set({
				quantity: newQty,
				lineTotal: newLineTotal,
				updatedBy: userId
			})
			.where(eq(table.purchaseOrderLineTable.id, lineId));

		// If this PO came from a PR line, releasing the unreceived remainder should
		// restore PR `qty_remaining` so it can be ordered again.
		if (ln.prLineId != null) {
			if (!Number.isInteger(ordered)) {
				throw error(400, 'Ordered quantity must be an integer');
			}
			const diff = String(ordered - received);
			await tx
				.update(table.purchaseRequisitionLineTable)
				.set({
					qtyRemaining: sql`${table.purchaseRequisitionLineTable.qtyRemaining} + ${diff}::numeric`,
					updatedBy: userId
				})
				.where(
					eq(table.purchaseRequisitionLineTable.id, ln.prLineId)
				);
		}

		// Recompute PO header total and status.
		const poLines = await tx
			.select({
				qty: table.purchaseOrderLineTable.quantity,
				received: table.purchaseOrderLineTable.qtyReceivedCumulative,
				lineTotal: table.purchaseOrderLineTable.lineTotal
			})
			.from(table.purchaseOrderLineTable)
			.where(
				and(
					eq(table.purchaseOrderLineTable.poId, input.poId),
					isNull(table.purchaseOrderLineTable.deletedAt)
				)
			);

		const nextTotal = poLines
			.reduce((s, r) => s + (Number(r.lineTotal) || 0), 0)
			.toFixed(2);

		const allDone = poLines.every(
			(r) => Number(r.received) >= Number(r.qty)
		);
		const anyReceived = poLines.some((r) => Number(r.received) > 0);

		const nextStatus = allDone
			? InvPoStatusTaggingEnum.CLOSED
			: anyReceived
				? InvPoStatusTaggingEnum.PARTIALLY_RECEIVED
				: po.statusTaggingId;

		await tx
			.update(table.purchaseOrderTable)
			.set({
				totalAmount: nextTotal,
				statusTaggingId: nextStatus,
				updatedBy: userId
			})
			.where(eq(table.purchaseOrderTable.id, input.poId));
	});

	return getPurchaseOrderById(event, {
		hospitalId: input.hospitalId,
		id: input.poId
	});
}
