import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { getServiceOrderDetailRowsForVisit } from '$lib/remote/table/information-table/service-order-detail.remote';
import { StringUtil } from '$lib/util/string.util.svelte';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { BillingDiscountTypeEnum } from '$lib/model/enum/billing-discount-type.enum';

type DiscountActionBody = {
	action?: 'discount';
	visitId?: number;
	discountTypeId?: number;
	discountPercent?: number | null;
	discountAmount?: number | null;
};

type PrintedActionBody = {
	action?: 'printed';
	visitId?: number;
};

function computeLineTotal(row: any): number {
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

async function upsertOpBillingSnapshot(opts: {
	hospitalId: string;
	visitId: number;
	branchId: string;
	userId: string;
	staffId: string | null;
	rows: any[];
	nowIso: string;
}): Promise<{
	billingId: number;
	billingRow: any;
	linesSubtotal: number;
	discountAmount: number;
	totalAmount: number;
}> {
	const db = ensureDb();
	const linesSubtotal = opts.rows.reduce(
		(sum: number, r: any) => sum + computeLineTotal(r),
		0
	);

	const existing = await db.query.opBillingTable.findFirst({
		where: and(
			eq(table.opBillingTable.visitId, opts.visitId),
			eq(table.opBillingTable.hospitalId, opts.hospitalId)
		)
	});

	const billingId = existing?.id
		? existing.id
		: (
				await db
					.insert(table.opBillingTable)
					.values({
						visitId: opts.visitId,
						hospitalId: opts.hospitalId,
						branchId: opts.branchId,
						linesSubtotal: linesSubtotal.toFixed(2),
						discountTypeId: BillingDiscountTypeEnum.NONE,
						discountAmount: '0',
						totalAmount: linesSubtotal.toFixed(2),
						createdAt: opts.nowIso,
						updatedAt: opts.nowIso,
						createdBy: opts.userId,
						updatedBy: opts.userId
					})
					.returning({ id: table.opBillingTable.id })
			)[0]!.id;

	// Keep any existing discount settings; recompute payable based on current subtotal.
	const discountTypeId =
		(existing?.discountTypeId as number | null | undefined) ??
		BillingDiscountTypeEnum.NONE;
	const discountPercent = Number(existing?.discountPercent ?? 0) || 0;
	const discountAmountExisting = Number(existing?.discountAmount ?? 0) || 0;

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

	// Neon HTTP driver does not support transactions; perform operations sequentially.
	// Hard-replace snapshot lines to reflect what is included right now.
	await db
		.delete(table.opBillingLineTable)
		.where(eq(table.opBillingLineTable.opBillingId, billingId));

	if (opts.rows.length > 0) {
		await db.insert(table.opBillingLineTable).values(
			opts.rows.map((r: any, idx: number) => ({
				opBillingId: billingId,
				lineIndex: idx + 1,
				serviceOrderDetailId: r.id ?? null,
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
			}))
		);
	}

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

	const billingRow = await db.query.opBillingTable.findFirst({
		where: eq(table.opBillingTable.id, billingId),
		with: {
			discountedByStaff: { with: { title: true } },
			printedByStaff: { with: { title: true } }
		}
	});

	return {
		billingId,
		billingRow,
		linesSubtotal,
		discountAmount,
		totalAmount
	};
}

export const GET: RequestHandler = async ({ url, params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const hospitalId = params.hospital_id ?? '';
	const visitIdParam = url.searchParams.get('visitId');
	const visitId = visitIdParam ? Number(visitIdParam) : 0;

	if (!visitId || !Number.isFinite(visitId) || visitId <= 0) {
		return json(
			{ error: 'Invalid visitId', items: [], visit: null },
			{ status: 400 }
		);
	}

	const [rows, visitRow] = await Promise.all([
		getServiceOrderDetailRowsForVisit({ visitId }),
		ensureDb().query.patientVisitTable.findFirst({
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
		})
	]);
	if (!visitRow) {
		return json({ error: 'Visit not found', items: [], visit: null }, { status: 404 });
	}

	const nowIso = new Date().toISOString();
	const snapshot = await upsertOpBillingSnapshot({
		hospitalId,
		visitId,
		branchId: visitRow.branchId!,
		userId: locals.user.id,
		staffId: locals.staff?.id ?? null,
		rows,
		nowIso
	});

	const visit = visitRow
		? {
				id: visitRow.id,
				visitNo: visitRow.visitNo?.trim() || String(visitRow.id),
				hospitalName: visitRow.hospital?.name?.trim() || null,
				branchName: visitRow.branch?.name?.trim() || null,
				patientName: visitRow.patient
					? StringUtil.patientDisplayName(visitRow.patient as any)
					: null,
				patientCode: visitRow.patient?.code?.trim() || null,
				visitDateIso: visitRow.createdAt ?? null,
				doctorName: visitRow.doctor
					? StringUtil.doctorOptionDisplayName(visitRow.doctor as any)
					: null
			}
		: null;

	return json(
		{
			items: rows,
			visit,
			billing: snapshot.billingRow
		},
		{ status: 200 }
	);
};

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const staffId = locals.staff?.id ?? null;
	if (!staffId) throw error(403, 'Staff account required');

	const hospitalId = params.hospital_id ?? '';
	const body = (await request.json().catch(() => ({}))) as
		| DiscountActionBody
		| PrintedActionBody;

	const visitId = Number((body as any)?.visitId ?? 0);
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

	// Ensure we have a billing header row + snapshot lines for this visit.
	const rowsForSnapshot = await getServiceOrderDetailRowsForVisit({ visitId });
	const snapshot = await upsertOpBillingSnapshot({
		hospitalId,
		visitId,
		branchId: visitRow.branchId!,
		userId: locals.user.id,
		staffId,
		rows: rowsForSnapshot,
		nowIso
	});

	if ((body as any)?.action === 'printed') {
		await ensureDb()
			.update(table.opBillingTable)
			.set({
				printedByStaffId: staffId,
				printedAt: nowIso,
				updatedAt: nowIso,
				updatedBy: locals.user.id
			})
			.where(eq(table.opBillingTable.id, snapshot.billingId));
		return json({ ok: true });
	}

	if ((body as any)?.action !== 'discount') {
		throw error(400, 'Unknown action');
	}

	const rawTypeId = Number((body as any)?.discountTypeId ?? BillingDiscountTypeEnum.NONE);
	const discountTypeId = (Object.values(BillingDiscountTypeEnum) as unknown[]).includes(
		rawTypeId
	)
		? (rawTypeId as BillingDiscountTypeEnum)
		: BillingDiscountTypeEnum.NONE;

	// Recompute totals from snapshot subtotal (same basis as UI).
	const subtotal = snapshot.linesSubtotal;

	let discountPercent: number | null = null;
	let discountAmount: number = 0;
	if (discountTypeId === BillingDiscountTypeEnum.PERCENT) {
		const pctRaw = Number((body as any)?.discountPercent ?? 0) || 0;
		discountPercent = clamp(pctRaw, 0, 100);
		discountAmount = Math.min(subtotal, (subtotal * discountPercent) / 100);
	} else if (discountTypeId === BillingDiscountTypeEnum.FIXED_AMOUNT) {
		const amtRaw = Number((body as any)?.discountAmount ?? 0) || 0;
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
		.where(eq(table.opBillingTable.id, snapshot.billingId));

	return json({ ok: true });
};

