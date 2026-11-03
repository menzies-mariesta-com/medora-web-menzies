import { error, json, type RequestHandler } from '@sveltejs/kit';
import {
	getPendingOpBillingServiceDetailRowsForVisit
} from '$lib/server/medora/observation/observation-emr.server';
import {
	dedupePendingBillRows,
	mergeClinicalAndBillingSetupPendingRows,
	type PendingBillLineRow
} from '$lib/server/medora/billing/billing-setup-bill-lines.server';
import {
	getOpBillingReadiness,
	opBillingCloseBlockedMessage
} from '$lib/server/medora/billing/op-billing-readiness.server';
import { closeExternalSaleVisitOnOpBillClosed } from '$lib/server/medora/billing/op-billing-external-visit.server';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { StringUtil } from '$lib/util/string.util.svelte';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { BillingDiscountTypeEnum } from '$lib/model/enum/billing-discount-type.enum';
import {
	BillingStatusTaggingEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { generatePrefix } from '$lib/server/medora/prefix/prefix-generator.server';
import type { OpBillingSchema } from '$lib/server/db/table/information-table/information-table-schema-type';
import { parseUuid } from '$lib/util/id.util';
import {
	normalizeIpBillingLineWrite,
	normalizeOpBillingHeaderWrite,
	normalizeOpBillingLineWrite
} from '$lib/server/medora/money-normalize.server';

type PendingDetailRow = PendingBillLineRow;

type OpBillingWithAuditStaff = OpBillingSchema & {
	discountedByStaff?: unknown;
	printedByStaff?: unknown;
};

type DiscountActionBody = {
	action?: 'discount';
	visitId?: string;
	discountTypeId?: number;
	discountPercent?: number | null;
	discountAmount?: number | null;
};

/**
 * Fixed lock class for `pg_advisory_xact_lock(class, hashtext(visitId))`.
 * Visit ids are UUIDs; Postgres advisory locks only accept int keys.
 */
const OP_BILLING_SYNC_LOCK_CLASS = 87231401;

async function nextBillNo(params: {
	hospitalId: string;
	branchId: string;
}): Promise<string> {
	const db = ensureDb();
	const today = new Date().toISOString().slice(0, 10);
	const [financialYear] = await db
		.select({ id: table.financialYearTable.id })
		.from(table.financialYearTable)
		.where(
			and(
				eq(table.financialYearTable.hospitalId, params.hospitalId),
				sql`${table.financialYearTable.startDate} <= ${today}`,
				sql`${table.financialYearTable.endDate} >= ${today}`
			)
		)
		.limit(1);
	if (!financialYear) {
		throw error(
			400,
			'Financial year is not configured for this hospital.'
		);
	}
	return generatePrefix({
		hospitalId: params.hospitalId,
		branchId: params.branchId,
		financialYearId: financialYear.id,
		prefixKey: PREFIX_PURPOSE_STORAGE.BILL_NO,
		context: {}
	});
}

type Tx = Parameters<
	Parameters<ReturnType<typeof ensureDb>['transaction']>[0]
>[0];

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

function visitIdFromJsonBody(body: unknown): string | null {
	if (typeof body !== 'object' || body === null) return null;
	const v = (body as { visitId?: unknown }).visitId;
	return parseUuid(v);
}

function postActionFromBody(body: unknown): unknown {
	if (typeof body !== 'object' || body === null) return undefined;
	return (body as { action?: unknown }).action;
}

/** One row per clinical/pharmacy/setup source id (defensive against race / join fan-out). */
function dedupePendingRows(
	rows: PendingDetailRow[]
): PendingDetailRow[] {
	return dedupePendingBillRows(rows);
}

async function listOpenOpBillings(
	db: Tx | ReturnType<typeof ensureDb>,
	opts: {
		visitId: string;
		hospitalId: string;
	}
): Promise<OpBillingSchema[]> {
	return db.query.opBillingTable.findMany({
		where: and(
			eq(table.opBillingTable.visitId, opts.visitId),
			eq(table.opBillingTable.hospitalId, opts.hospitalId),
			eq(
				table.opBillingTable.statusTaggingId,
				BillingStatusTaggingEnum.OPEN
			),
			ne(table.opBillingTable.statusId, StatusEnum.DELETED)
		),
		orderBy: [asc(table.opBillingTable.id)]
	});
}

async function softDeleteOpBillingHeader(
	db: Tx | ReturnType<typeof ensureDb>,
	opts: {
		billingId: number;
		userId: string;
		nowIso: string;
	}
): Promise<void> {
	await db
		.delete(table.opBillingLineTable)
		.where(eq(table.opBillingLineTable.opBillingId, opts.billingId));
	await db
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
async function consolidateOpenOpBillings(
	db: Tx | ReturnType<typeof ensureDb>,
	opts: {
		visitId: string;
		hospitalId: string;
		userId: string;
		nowIso: string;
	}
): Promise<OpBillingSchema | null> {
	const open = await listOpenOpBillings(db, opts);
	if (open.length === 0) return null;
	if (open.length === 1) return open[0]!;

	const keep = open[open.length - 1]!;
	for (const b of open.slice(0, -1)) {
		await softDeleteOpBillingHeader(db, {
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
 *
 * Serialized per visit (advisory xact lock) so concurrent GET/POST cannot
 * interleave delete+insert and duplicate `op_billing_line` rows.
 */
export async function syncOpenOpBillingForVisit(opts: {
	hospitalId: string;
	visitId: string;
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
	const pendingRows = dedupePendingRows(
		await mergeClinicalAndBillingSetupPendingRows({
			hospitalId: opts.hospitalId,
			visitId: opts.visitId,
			branchId: opts.branchId,
			clinicalRows: await getPendingOpBillingServiceDetailRowsForVisit({
				visitId: opts.visitId,
				hospitalId: opts.hospitalId,
				branchId: opts.branchId
			})
		})
	);

	return ensureDb().transaction(async (tx) => {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(${OP_BILLING_SYNC_LOCK_CLASS}, hashtext(${opts.visitId}::text))`
		);

		let openBill = await consolidateOpenOpBillings(tx, {
			visitId: opts.visitId,
			hospitalId: opts.hospitalId,
			userId: opts.userId,
			nowIso: opts.nowIso
		});

		if (pendingRows.length === 0) {
			if (openBill) {
				await softDeleteOpBillingHeader(tx, {
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
			const [inserted] = await tx
				.insert(table.opBillingTable)
				.values({
					visitId: opts.visitId,
					hospitalId: opts.hospitalId,
					branchId: opts.branchId,
					linesSubtotal: '0',
					discountTypeId: BillingDiscountTypeEnum.NONE,
					discountAmount: '0',
					totalAmount: '0',
					statusTaggingId: BillingStatusTaggingEnum.OPEN,
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
		const discountAmountExisting =
			Number(openBill.discountAmount ?? 0) || 0;

		let discountAmount = 0;
		if (discountTypeId === BillingDiscountTypeEnum.PERCENT) {
			const pct = clamp(discountPercent, 0, 100);
			discountAmount = Math.min(
				linesSubtotal,
				(linesSubtotal * pct) / 100
			);
		} else if (
			discountTypeId === BillingDiscountTypeEnum.FIXED_AMOUNT
		) {
			discountAmount = Math.min(
				linesSubtotal,
				Math.max(0, discountAmountExisting)
			);
		}

		const totalAmount = Math.max(0, linesSubtotal - discountAmount);

		await tx
			.delete(table.opBillingLineTable)
			.where(eq(table.opBillingLineTable.opBillingId, billingId));

		await tx.insert(table.opBillingLineTable).values(
			pendingRows.map((r: PendingDetailRow, idx: number) => {
				const serviceOrderDetailId =
					r.lineSource === 'service_order_detail' ? r.id : null;
				const medicationOrderLineId =
					r.lineSource === 'medication_order_line'
						? r.medicationOrderLineId
						: null;
				const departmentConsumptionLineId =
					r.lineSource === 'department_consumption_line'
						? r.departmentConsumptionLineId
						: null;
				return normalizeOpBillingLineWrite({
					opBillingId: billingId,
					lineIndex: idx + 1,
					serviceOrderDetailId,
					medicationOrderLineId,
					departmentConsumptionLineId,
					serviceId: r.serviceId,
					serviceNameSnapshot: r.serviceName ?? null,
					subCategoryId: r.subCategoryId ?? null,
					subCategoryNameSnapshot: r.subCategoryName ?? null,
					orderNoSnapshot: r.orderNo ?? null,
					discount: r.discount ?? null,
					serviceAmount: r.serviceAmount ?? null,
					serviceTaxAmount: r.serviceTaxAmount ?? null,
					serviceUnit: r.serviceUnit ?? null,
					lineTotal: computeLineTotal(r),
					createdAt: opts.nowIso,
					updatedAt: opts.nowIso,
					createdBy: opts.userId,
					updatedBy: opts.userId
				});
			})
		);

		await tx
			.update(table.opBillingTable)
			.set(
				normalizeOpBillingHeaderWrite({
					branchId: opts.branchId,
					linesSubtotal,
					discountAmount,
					totalAmount,
					updatedAt: opts.nowIso,
					updatedBy: opts.userId
				})
			)
			.where(eq(table.opBillingTable.id, billingId));

		const billingRow = (await tx.query.opBillingTable.findFirst({
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
	});
}

export const GET: RequestHandler = async (event) => {
	const { url, params, locals } = event;
	if (!locals.user) throw error(401, 'Unauthorized');
	const hospitalId = params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const visitIdParam = url.searchParams.get('visitId');
	const visitId = parseUuid(visitIdParam);

	if (!visitId) {
		return json(
			{
				error: 'Invalid visitId',
				items: [],
				visit: null,
				billing: null,
				readiness: null
			},
			{ status: 400 }
		);
	}

	const visitRow = await ensureDb().query.patientVisitTable.findFirst(
		{
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
		}
	);
	if (!visitRow) {
		return json(
			{
				error: 'Visit not found',
				items: [],
				visit: null,
				billing: null,
				readiness: null
			},
			{ status: 404 }
		);
	}
	if (String(visitRow.hospitalId ?? '') !== hospitalId) {
		return json(
			{
				error: 'Visit mismatch',
				items: [],
				visit: null,
				billing: null,
				readiness: null
			},
			{ status: 400 }
		);
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

	const readiness = await getOpBillingReadiness(event, {
		hospitalId,
		visitId,
		pendingBillLineCount: sync.pendingRows.length,
		billAlreadyClosed:
			sync.billingRow?.statusTaggingId ===
			BillingStatusTaggingEnum.CLOSED
	});

	return json(
		{
			items: sync.pendingRows,
			visit,
			billing: sync.billingRow,
			readiness
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
	await ensureCanAccessHospital(event, hospitalId);
	const body: unknown = await request.json().catch(() => ({}));

	const visitId = visitIdFromJsonBody(body);
	if (!visitId) {
		throw error(400, 'Invalid visitId');
	}

	const visitRow = await ensureDb().query.patientVisitTable.findFirst(
		{
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
		}
	);
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

		const readiness = await getOpBillingReadiness(event, {
			hospitalId,
			visitId,
			pendingBillLineCount: sync.pendingRows.length,
			billAlreadyClosed:
				sync.billingRow?.statusTaggingId ===
				BillingStatusTaggingEnum.CLOSED
		});

		if (!readiness.canCloseBill) {
			throw error(
				400,
				opBillingCloseBlockedMessage(readiness.blockReasonKey)
			);
		}

		if (!sync.billingId || !sync.billingRow) {
			throw error(
				400,
				opBillingCloseBlockedMessage('no_billable_lines')
			);
		}

		const db = ensureDb();
		let billNo = sync.billingRow.billNo?.trim() || null;
		if (!billNo) {
			billNo = await nextBillNo({
				hospitalId,
				branchId: visitRow.branchId!
			});
		}
		await db.transaction(async (tx) => {
			await tx
				.update(table.opBillingTable)
				.set({
					billNo,
					statusTaggingId: BillingStatusTaggingEnum.CLOSED,
					updatedAt: nowIso,
					updatedBy: locals.user.id
				})
				.where(eq(table.opBillingTable.id, sync.billingId));

			await closeExternalSaleVisitOnOpBillClosed(tx, {
				hospitalId,
				visitId,
				userId: locals.user.id,
				nowIso
			});
		});
		return json({ ok: true, billNo });
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
	const discountTypeId = (
		Object.values(BillingDiscountTypeEnum) as unknown[]
	).includes(rawTypeId)
		? (rawTypeId as BillingDiscountTypeEnum)
		: BillingDiscountTypeEnum.NONE;

	const subtotal = sync.linesSubtotal;

	let discountPercent: number | null = null;
	let discountAmount: number = 0;
	if (discountTypeId === BillingDiscountTypeEnum.PERCENT) {
		const pctRaw = Number(discountBody.discountPercent ?? 0) || 0;
		discountPercent = clamp(pctRaw, 0, 100);
		discountAmount = Math.min(
			subtotal,
			(subtotal * discountPercent) / 100
		);
	} else if (
		discountTypeId === BillingDiscountTypeEnum.FIXED_AMOUNT
	) {
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
			...normalizeOpBillingHeaderWrite({
				linesSubtotal: subtotal,
				discountPercent:
					discountPercent != null ? discountPercent : null,
				discountAmount,
				totalAmount,
				updatedAt: nowIso,
				updatedBy: locals.user.id
			}),
			discountTypeId,
			discountedByStaffId: staffId,
			discountedAt: nowIso
		})
		.where(eq(table.opBillingTable.id, sync.billingId));

	return json({ ok: true });
};
