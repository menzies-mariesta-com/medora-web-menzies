import { error, json, type RequestHandler } from '@sveltejs/kit';
import {
	getPendingOpBillingServiceDetailRowsForVisit,
	type OpBillingPendingLineRow
} from '$lib/server/heka/observation/observation-emr.server';
import { StringUtil } from '$lib/util/string.util.svelte';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import { BillingDiscountTypeEnum } from '$lib/model/enum/billing-discount-type.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { OpBillingSchema } from '$lib/server/db/table/information-table/information-table-schema-type';

type PendingDetailRow = OpBillingPendingLineRow;

type OpBillingWithAuditStaff = OpBillingSchema & {
	discountedByStaff?: unknown;
	printedByStaff?: unknown;
};

type DiscountActionBody = {
	action?: 'discount';
	visitId?: number;
	discountTypeId?: number;
	discountPercent?: number | null;
	discountAmount?: number | null;
};

function computeLineTotal(row: PendingDetailRow): number {
	const amount = Number(row?.serviceAmount ?? 0) || 0;
	const tax = Number(row?.serviceTaxAmount ?? 0) || 0;
	const discount = Number(row?.discount ?? 0) || 0;
	const unit =
		row?.serviceUnit && Number(row.serviceUnit) > 0
			? Number(row.serviceUnit)
			: 1;
	return (amount + tax - discount) * unit;
}

function clamp(n: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, n));
}

function visitIdFromJsonBody(body: unknown): number {
	if (typeof body !== 'object' || body === null) return 0;
	const v = (body as { visitId?: unknown }).visitId;
	const n = Number(v ?? 0);
	return n;
}

function postActionFromBody(body: unknown): unknown {
	if (typeof body !== 'object' || body === null) return undefined;
	return (body as { action?: unknown }).action;
}

async function listOpenOpBillings(opts: {
	visitId: number;
	hospitalId: string;
}): Promise<OpBillingSchema[]> {
	return ensureDb().query.opBillingTable.findMany({
		where: and(
			eq(table.opBillingTable.visitId, opts.visitId),
			eq(table.opBillingTable.hospitalId, opts.hospitalId),
			isNull(table.opBillingTable.printedAt),
			ne(table.opBillingTable.statusId, StatusEnum.DELETED)
		),
		orderBy: [asc(table.opBillingTable.id)]
	});
}

async function softDeleteOpBillingHeader(opts: {
	billingId: number;
	userId: string;
	nowIso: string;
}): Promise<void> {
	await ensureDb()
		.delete(table.opBillingLineTable)
		.where(eq(table.opBillingLineTable.opBillingId, opts.billingId));
	await ensureDb()
		.update(table.opBillingTable)
		.set({
			statusId: StatusEnum.DELETED,
			deletedAt: opts.nowIso,
			deletedBy: opts.userId,
			updatedAt: opts.nowIso,
			updatedBy: opts.userId
		})
		.where(eq(table.opBillingTable.id, opts.billingId));
}

/** At most one open bill per visit; older stray drafts are removed. */
async function consolidateOpenOpBillings(opts: {
	visitId: number;
	hospitalId: string;
	userId: string;
	nowIso: string;
}): Promise<OpBillingSchema | null> {
	const open = await listOpenOpBillings(opts);
	if (open.length === 0) return null;
	if (open.length === 1) return open[0]!;

	const keep = open[open.length - 1]!;
	for (const b of open.slice(0, -1)) {
		await softDeleteOpBillingHeader({
			billingId: b.id,
			userId: opts.userId,
			nowIso: opts.nowIso
		});
	}
	return keep;
}

/**
 * Syncs the single open OP bill for the visit to nursing-complete lines that are
 * not yet on any closed bill. When nothing is pending, the open draft is removed.
 */
async function syncOpenOpBillingForVisit(opts: {
	hospitalId: string;
	visitId: number;
	branchId: string;
	userId: string;
	staffId: string | null;
	nowIso: string;
}): Promise<{
	billingId: number | null;
	billingRow: OpBillingWithAuditStaff | null;
	linesSubtotal: number;
	discountAmount: number;
	totalAmount: number;
	pendingRows: PendingDetailRow[];
}> {
	const db = ensureDb();
	const pendingRows = await getPendingOpBillingServiceDetailRowsForVisit({
		visitId: opts.visitId,
		hospitalId: opts.hospitalId,
		branchId: opts.branchId
	});

	let openBill = await consolidateOpenOpBillings({
		visitId: opts.visitId,
		hospitalId: opts.hospitalId,
		userId: opts.userId,
		nowIso: opts.nowIso
	});

	if (pendingRows.length === 0) {
		if (openBill) {
			await softDeleteOpBillingHeader({
				billingId: openBill.id,
				userId: opts.userId,
				nowIso: opts.nowIso
			});
		}
		return {
			billingId: null,
			billingRow: null,
			linesSubtotal: 0,
			discountAmount: 0,
			totalAmount: 0,
			pendingRows: []
		};
	}

	if (!openBill) {
		const [inserted] = await db
			.insert(table.opBillingTable)
			.values({
				visitId: opts.visitId,
				hospitalId: opts.hospitalId,
				branchId: opts.branchId,
				linesSubtotal: '0',
				discountTypeId: BillingDiscountTypeEnum.NONE,
				discountAmount: '0',
				totalAmount: '0',
				createdAt: opts.nowIso,
				updatedAt: opts.nowIso,
				createdBy: opts.userId,
				updatedBy: opts.userId
			})
			.returning();
		openBill = inserted!;
	}

	const billingId = openBill.id;
	const linesSubtotal = pendingRows.reduce(
		(sum: number, r: PendingDetailRow) => sum + computeLineTotal(r),
		0
	);

	const discountTypeId =
		(openBill.discountTypeId as number | null | undefined) ??
		BillingDiscountTypeEnum.NONE;
	const discountPercent = Number(openBill.discountPercent ?? 0) || 0;
	const discountAmountExisting = Number(openBill.discountAmount ?? 0) || 0;

	let discountAmount = 0;
	if (discountTypeId === BillingDiscountTypeEnum.PERCENT) {
		const pct = clamp(discountPercent, 0, 100);
		discountAmount = Math.min(linesSubtotal, (linesSubtotal * pct) / 100);
	} else if (discountTypeId === BillingDiscountTypeEnum.FIXED_AMOUNT) {
		discountAmount = Math.min(
			linesSubtotal,
			Math.max(0, discountAmountExisting)
		);
	}

	const totalAmount = Math.max(0, linesSubtotal - discountAmount);

	await db
		.delete(table.opBillingLineTable)
		.where(eq(table.opBillingLineTable.opBillingId, billingId));

	await db.insert(table.opBillingLineTable).values(
		pendingRows.map((r: PendingDetailRow, idx: number) => {
			const serviceOrderDetailId =
				r.lineSource === 'service_order_detail' ? r.id : null;
			const medicationOrderLineId =
				r.lineSource === 'medication_order_line' ? r.medicationOrderLineId : null;
			return {
				opBillingId: billingId,
				lineIndex: idx + 1,
				serviceOrderDetailId,
				medicationOrderLineId,
				serviceId: r.serviceId,
				serviceNameSnapshot: r.serviceName ?? null,
				subCategoryId: r.subCategoryId ?? null,
				subCategoryNameSnapshot: r.subCategoryName ?? null,
				orderNoSnapshot: r.orderNo ?? null,
				discount: r.discount ?? null,
				serviceAmount: r.serviceAmount ?? null,
				serviceTaxAmount: r.serviceTaxAmount ?? null,
				serviceUnit: r.serviceUnit ?? null,
				lineTotal: computeLineTotal(r).toFixed(2),
				createdAt: opts.nowIso,
				updatedAt: opts.nowIso,
				createdBy: opts.userId,
				updatedBy: opts.userId
			};
		})
	);

	await db
		.update(table.opBillingTable)
		.set({
			branchId: opts.branchId,
			linesSubtotal: linesSubtotal.toFixed(2),
			discountAmount: discountAmount.toFixed(2),
			totalAmount: totalAmount.toFixed(2),
			updatedAt: opts.nowIso,
			updatedBy: opts.userId
		})
		.where(eq(table.opBillingTable.id, billingId));

	const billingRow = (await db.query.opBillingTable.findFirst({
		where: eq(table.opBillingTable.id, billingId),
		with: {
			discountedByStaff: { with: { title: true } },
			printedByStaff: { with: { title: true } }
		}
	})) as OpBillingWithAuditStaff | null;

	return {
		billingId,
		billingRow,
		linesSubtotal,
		discountAmount,
		totalAmount,
		pendingRows
	};
}

export const GET: RequestHandler = async (event) => {
	const { url, params, locals } = event;
	if (!locals.user) throw error(401, 'Unauthorized');
	const hospitalId = params.hospital_id ?? '';
	const visitIdParam = url.searchParams.get('visitId');
	const visitId = visitIdParam ? Number(visitIdParam) : 0;

	if (!visitId || !Number.isFinite(visitId) || visitId <= 0) {
		return json(
			{ error: 'Invalid visitId', items: [], visit: null, billing: null },
			{ status: 400 }
		);
	}

	const visitRow = await ensureDb().query.patientVisitTable.findFirst({
		where: (t, { eq }) => eq(t.id, visitId),
		with: {
			patient: { with: { title: true, gender: true } },
			hospital: true,
			branch: true,
			doctor: {
				with: {
					title: true,
					specialization: true,
					staffDetail: true
				}
			}
		}
	});
	if (!visitRow) {
		return json({ error: 'Visit not found', items: [], visit: null, billing: null }, { status: 404 });
	}
	if (String(visitRow.hospitalId ?? '') !== hospitalId) {
		return json({ error: 'Visit mismatch', items: [], visit: null, billing: null }, { status: 400 });
	}

	const nowIso = new Date().toISOString();
	const sync = await syncOpenOpBillingForVisit({
		hospitalId,
		visitId,
		branchId: visitRow.branchId!,
		userId: locals.user.id,
		staffId: locals.staff?.id ?? null,
		nowIso
	});

	const visit = {
		id: visitRow.id,
		visitNo: visitRow.visitNo?.trim() || String(visitRow.id),
		hospitalName: visitRow.hospital?.name?.trim() || null,
		branchName: visitRow.branch?.name?.trim() || null,
		patientName: visitRow.patient
			? // Drizzle `with` shape is wider than StringUtil’s param type
				StringUtil.patientDisplayName(
					visitRow.patient as Parameters<
						typeof StringUtil.patientDisplayName
					>[0]
				)
			: null,
		patientCode: visitRow.patient?.code?.trim() || null,
		visitDateIso: visitRow.createdAt ?? null,
		doctorName: visitRow.doctor
			? StringUtil.doctorOptionDisplayName(
					visitRow.doctor as Parameters<
						typeof StringUtil.doctorOptionDisplayName
					>[0]
				)
			: null
	};

	return json(
		{
			items: sync.pendingRows,
			visit,
			billing: sync.billingRow
		},
		{ status: 200 }
	);
};

export const POST: RequestHandler = async (event) => {
	const { request, locals, params } = event;
	if (!locals.user) throw error(401, 'Unauthorized');
	const staffId = locals.staff?.id ?? null;
	if (!staffId) throw error(403, 'Staff account required');

	const hospitalId = params.hospital_id ?? '';
	const body: unknown = await request.json().catch(() => ({}));

	const visitId = visitIdFromJsonBody(body);
	if (!visitId || !Number.isFinite(visitId) || visitId <= 0) {
		throw error(400, 'Invalid visitId');
	}

	const visitRow = await ensureDb().query.patientVisitTable.findFirst({
		where: (t, { eq }) => eq(t.id, visitId),
		with: {
			patient: { with: { title: true, gender: true } },
			hospital: true,
			branch: true,
			doctor: {
				with: {
					title: true,
					specialization: true,
					staffDetail: true
				}
			}
		}
	});
	if (!visitRow) throw error(404, 'Visit not found');
	if (String(visitRow.hospitalId ?? '') !== hospitalId) {
		throw error(400, 'Visit does not belong to hospital');
	}

	const nowIso = new Date().toISOString();

	const action = postActionFromBody(body);
	const isClose = action === 'printed' || action === 'close';

	if (isClose) {
		const sync = await syncOpenOpBillingForVisit({
			hospitalId,
			visitId,
			branchId: visitRow.branchId!,
			userId: locals.user.id,
			staffId,
			nowIso
		});
		if (
			!sync.billingId ||
			!sync.billingRow ||
			sync.pendingRows.length === 0
		) {
			throw error(400, 'There are no completed services pending billing for this visit.');
		}

		await ensureDb()
			.update(table.opBillingTable)
			.set({
				printedByStaffId: staffId,
				printedAt: nowIso,
				updatedAt: nowIso,
				updatedBy: locals.user.id
			})
			.where(eq(table.opBillingTable.id, sync.billingId));
		return json({ ok: true });
	}

	if (action !== 'discount') {
		throw error(400, 'Unknown action');
	}

	const sync = await syncOpenOpBillingForVisit({
		hospitalId,
		visitId,
		branchId: visitRow.branchId!,
		userId: locals.user.id,
		staffId,
		nowIso
	});

	if (!sync.billingId || !sync.billingRow) {
		throw error(
			400,
			'No open OP bill; there are no completed services pending billing.'
		);
	}

	const discountBody =
		typeof body === 'object' && body !== null
			? (body as DiscountActionBody)
			: {};
	const rawTypeId = Number(
		discountBody.discountTypeId ?? BillingDiscountTypeEnum.NONE
	);
	const discountTypeId = (Object.values(BillingDiscountTypeEnum) as unknown[]).includes(
		rawTypeId
	)
		? (rawTypeId as BillingDiscountTypeEnum)
		: BillingDiscountTypeEnum.NONE;

	const subtotal = sync.linesSubtotal;

	let discountPercent: number | null = null;
	let discountAmount: number = 0;
	if (discountTypeId === BillingDiscountTypeEnum.PERCENT) {
		const pctRaw = Number(discountBody.discountPercent ?? 0) || 0;
		discountPercent = clamp(pctRaw, 0, 100);
		discountAmount = Math.min(subtotal, (subtotal * discountPercent) / 100);
	} else if (discountTypeId === BillingDiscountTypeEnum.FIXED_AMOUNT) {
		const amtRaw = Number(discountBody.discountAmount ?? 0) || 0;
		discountAmount = Math.min(subtotal, Math.max(0, amtRaw));
	} else {
		discountPercent = null;
		discountAmount = 0;
	}

	const totalAmount = Math.max(0, subtotal - discountAmount);

	await ensureDb()
		.update(table.opBillingTable)
		.set({
			linesSubtotal: subtotal.toFixed(2),
			discountTypeId,
			discountPercent:
				discountPercent != null ? discountPercent.toFixed(2) : null,
			discountAmount: discountAmount.toFixed(2),
			totalAmount: totalAmount.toFixed(2),
			discountedByStaffId: staffId,
			discountedAt: nowIso,
			updatedAt: nowIso,
			updatedBy: locals.user.id
		})
		.where(eq(table.opBillingTable.id, sync.billingId));

	return json({ ok: true });
};
