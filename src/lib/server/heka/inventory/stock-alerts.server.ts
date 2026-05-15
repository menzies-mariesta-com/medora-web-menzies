import { createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { type RequestEvent } from '@sveltejs/kit';
import {
	and,
	asc,
	desc,
	eq,
	gt,
	inArray,
	isNull,
	ne,
	sql
} from 'drizzle-orm';
import { renderStockAlertEmail } from '$lib/asset/email/stock-alert';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { StatusColorEnum } from '$lib/model/enum/color.enum';
import { ensureHospitalInventoryAccess } from './inventory-scope.server';
import {
	getDefaultExpiringSoonDaysForHospital,
	loadStockAlertSettingsEffectiveDb,
	listActiveStockAlertRecipientSubscriptions
} from '$lib/server/heka/inventory/stock-alert-settings.server';
import { sendEmailServer } from '$lib/server/util/mailer.server';
import { log } from '$lib/logger';

export type StockAlertsSummary = {
	lowStockCount: number;
	expiredLotCount: number;
	expiringSoonLotCount: number;
};

export type LowStockRow = {
	storeId: number;
	storeName: string | null;
	itemId: number;
	itemName: string | null;
	qty: string;
	minQty: string;
};

export type ExpiryLotRow = {
	storeId: number;
	storeName: string | null;
	itemId: number;
	itemName: string | null;
	batchId: number;
	batchNo: string;
	expiryDate: string | null;
	qty: string;
};

async function listLowStockDb(input: {
	hospitalId: string;
	storeId?: number;
	/** Restrict to these stores (e.g. branch scope); ignored when `storeId` is set. */
	storeIds?: number[];
	limit?: number;
}): Promise<LowStockRow[]> {
	const limit = Math.min(500, Math.max(1, input.limit ?? 50));

	let cond = and(
		eq(table.invStockTable.hospitalId, input.hospitalId),
		isNull(table.invStockTable.deletedAt),
		isNull(table.invItemReorderLevelTable.deletedAt),
		eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
		sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`
	);
	if (typeof input.storeId === 'number') {
		cond = and(cond, eq(table.invStockTable.storeId, input.storeId))!;
	} else if (input.storeIds != null && input.storeIds.length > 0) {
		cond = and(
			cond,
			inArray(table.invStockTable.storeId, input.storeIds)
		)!;
	}

	return await ensureDb()
		.select({
			storeId: table.invStockTable.storeId,
			storeName: table.storeTable.storeName,
			itemId: table.invStockTable.itemId,
			itemName: table.itemMasterTable.itemName,
			qty: sql<string>`coalesce(sum(${table.invStockTable.quantity}::numeric), 0)::text`,
			minQty: sql<string>`max(${table.invItemReorderLevelTable.minQty}::numeric)::text`
		})
		.from(table.invItemReorderLevelTable)
		.innerJoin(
			table.invStockTable,
			and(
				eq(
					table.invStockTable.hospitalId,
					table.invItemReorderLevelTable.hospitalId
				),
				eq(
					table.invStockTable.storeId,
					table.invItemReorderLevelTable.storeId
				),
				eq(
					table.invStockTable.itemId,
					table.invItemReorderLevelTable.itemId
				),
				isNull(table.invStockTable.deletedAt)
			)!
		)
		.innerJoin(
			table.storeTable,
			eq(table.invStockTable.storeId, table.storeTable.id)
		)
		.innerJoin(
			table.hospitalBranchTable,
			eq(table.storeTable.branchId, table.hospitalBranchTable.id)
		)
		.innerJoin(
			table.itemMasterTable,
			eq(table.invStockTable.itemId, table.itemMasterTable.id)
		)
		.where(cond)
		.groupBy(
			table.invStockTable.storeId,
			table.storeTable.storeName,
			table.invStockTable.itemId,
			table.itemMasterTable.itemName
		)
		.having(
			sql`coalesce(sum(${table.invStockTable.quantity}::numeric), 0) < max(${table.invItemReorderLevelTable.minQty}::numeric)`
		)
		.orderBy(
			asc(table.storeTable.storeName),
			asc(table.itemMasterTable.itemName)
		)
		.limit(limit);
}

async function listExpiryLotsDb(input: {
	hospitalId: string;
	storeId?: number;
	storeIds?: number[];
	mode: 'expired' | 'expiringSoon';
	/** Used as SQL fallback days when item_master.expiry_alert_lead_days is null (expiringSoon only). */
	fallbackExpiringSoonDays: number;
	limit?: number;
}): Promise<ExpiryLotRow[]> {
	const limit = Math.min(200, Math.max(1, input.limit ?? 50));
	const fallbackDays = Math.min(
		365,
		Math.max(1, Math.floor(input.fallbackExpiringSoonDays))
	);
	const today = new Date().toISOString().slice(0, 10);

	let cond = and(
		eq(table.invStockTable.hospitalId, input.hospitalId),
		isNull(table.invStockTable.deletedAt),
		gt(table.invStockTable.quantity, '0'),
		eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
		sql`${table.storeTable.statusId} <> ${StatusEnum.DELETED}`
	);
	if (typeof input.storeId === 'number') {
		cond = and(cond, eq(table.invStockTable.storeId, input.storeId))!;
	} else if (input.storeIds != null && input.storeIds.length > 0) {
		cond = and(
			cond,
			inArray(table.invStockTable.storeId, input.storeIds)
		)!;
	}

	if (input.mode === 'expired') {
		cond = and(
			cond,
			sql`${table.itemBatchTable.expiryDate} < ${today}`
		)!;
	} else {
		cond = and(
			cond,
			sql`${table.itemBatchTable.expiryDate} >= ${today}`,
			sql`${table.itemBatchTable.expiryDate} <= (${today}::date + COALESCE(${table.itemMasterTable.expiryAlertLeadDays}, ${fallbackDays})::integer * interval '1 day')`
		)!;
	}

	return await ensureDb()
		.select({
			storeId: table.invStockTable.storeId,
			storeName: table.storeTable.storeName,
			itemId: table.invStockTable.itemId,
			itemName: table.itemMasterTable.itemName,
			batchId: table.invStockTable.batchId,
			batchNo: table.itemBatchTable.batchNo,
			expiryDate: sql<
				string | null
			>`${table.itemBatchTable.expiryDate}::text`,
			qty: table.invStockTable.quantity
		})
		.from(table.invStockTable)
		.innerJoin(
			table.itemBatchTable,
			eq(table.invStockTable.batchId, table.itemBatchTable.id)
		)
		.innerJoin(
			table.storeTable,
			eq(table.invStockTable.storeId, table.storeTable.id)
		)
		.innerJoin(
			table.hospitalBranchTable,
			eq(table.storeTable.branchId, table.hospitalBranchTable.id)
		)
		.innerJoin(
			table.itemMasterTable,
			eq(table.invStockTable.itemId, table.itemMasterTable.id)
		)
		.where(cond)
		.orderBy(
			sql`${table.itemBatchTable.expiryDate} ASC NULLS LAST`,
			asc(table.itemBatchTable.batchNo)
		)
		.limit(limit);
}

export async function listLowStock(
	event: RequestEvent,
	input: { hospitalId: string; storeId?: number; limit?: number }
): Promise<LowStockRow[]> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);
	return listLowStockDb(input);
}

export async function listExpiryLots(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId?: number;
		mode: 'expired' | 'expiringSoon';
		daysSoon?: number;
		limit?: number;
	}
): Promise<ExpiryLotRow[]> {
	await ensureHospitalInventoryAccess(event, input.hospitalId);

	const hospitalDefault = await getDefaultExpiringSoonDaysForHospital(
		input.hospitalId
	);
	const fallbackDays =
		input.daysSoon != null && Number.isFinite(input.daysSoon)
			? Math.min(365, Math.max(1, Math.floor(input.daysSoon)))
			: hospitalDefault;

	return listExpiryLotsDb({
		hospitalId: input.hospitalId,
		storeId: input.storeId,
		mode: input.mode,
		fallbackExpiringSoonDays: fallbackDays,
		limit: input.limit
	});
}

async function maybeNotifyStaffInApp(params: {
	staffId: string;
	hospitalId: string;
	eventType: string;
	severity: string;
	title: string;
	message: string;
	link: string;
	minGapMinutes: number;
}): Promise<void> {
	const minGapMs = Math.max(1, params.minGapMinutes) * 60_000;
	const [last] = await ensureDb()
		.select({
			createdAt: table.notificationTable.createdAt,
			message: table.notificationTable.message
		})
		.from(table.notificationTable)
		.where(
			and(
				eq(table.notificationTable.recipientStaffId, params.staffId),
				eq(table.notificationTable.hospitalId, params.hospitalId),
				eq(table.notificationTable.eventType, params.eventType),
				isNull(table.notificationTable.deletedAt),
				ne(table.notificationTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(desc(table.notificationTable.createdAt))
		.limit(1);

	if (last?.createdAt) {
		const t = Date.parse(String(last.createdAt));
		const withinGap = Number.isFinite(t) && Date.now() - t < minGapMs;
		const sameSummary =
			last.message != null && last.message === params.message;
		if (withinGap && sameSummary) return;
	}

	await ensureDb().insert(table.notificationTable).values({
		recipientStaffId: params.staffId,
		hospitalId: params.hospitalId,
		eventType: params.eventType,
		severity: params.severity,
		title: params.title,
		message: params.message,
		link: params.link
	});
}

function resolvePublicOrigin(): string {
	const raw = env.BETTER_AUTH_BASE_URL?.trim();
	if (!raw) return '';
	try {
		return new URL(raw).origin;
	} catch {
		return '';
	}
}

/** Absolute URL for email clients when `BETTER_AUTH_BASE_URL` is set; otherwise relative path. */
function toAbsoluteAppUrl(path: string): string {
	const origin = resolvePublicOrigin();
	if (!origin) return path;
	const p = path.startsWith('/') ? path : `/${path}`;
	return `${origin}${p}`;
}

function stockAlertEmailPayloadDigest(plainText: string): string {
	return createHash('sha256')
		.update(plainText)
		.digest('hex')
		.slice(0, 24);
}

async function resolveStaffEmail(
	staffId: string
): Promise<string | null> {
	const [row] = await ensureDb()
		.select({ email: table.userTable.email })
		.from(table.staffTable)
		.innerJoin(
			table.userTable,
			eq(table.staffTable.userId, table.userTable.id)
		)
		.where(eq(table.staffTable.id, staffId))
		.limit(1);
	const e = row?.email?.trim();
	if (!e) {
		log.warn(
			'Stock alert email skipped: linked login user has no email address',
			{ staffId }
		);
	}
	return e ? e : null;
}

async function maybeSendStockAlertEmail(params: {
	staffId: string;
	hospitalId: string;
	storeId: number;
	eventType: string;
	minGapMinutes: number;
	subject: string;
	html: string;
	text: string;
}): Promise<void> {
	const minGapMs = Math.max(1, params.minGapMinutes) * 60_000;
	const digest = stockAlertEmailPayloadDigest(params.text);
	const [last] = await ensureDb()
		.select({
			sentAt: table.invStockAlertEmailSentTable.sentAt,
			payloadDigest: table.invStockAlertEmailSentTable.payloadDigest
		})
		.from(table.invStockAlertEmailSentTable)
		.where(
			and(
				eq(
					table.invStockAlertEmailSentTable.hospitalId,
					params.hospitalId
				),
				eq(
					table.invStockAlertEmailSentTable.recipientStaffId,
					params.staffId
				),
				eq(table.invStockAlertEmailSentTable.storeId, params.storeId),
				eq(
					table.invStockAlertEmailSentTable.eventType,
					params.eventType
				)
			)
		)
		.orderBy(desc(table.invStockAlertEmailSentTable.sentAt))
		.limit(1);

	if (last?.sentAt) {
		const t = Date.parse(String(last.sentAt));
		const withinGap = Number.isFinite(t) && Date.now() - t < minGapMs;
		if (withinGap) {
			const prev = last.payloadDigest;
			if (prev == null || prev === '') return;
			if (prev === digest) return;
		}
	}

	const to = await resolveStaffEmail(params.staffId);
	if (!to) return;

	const ok = await sendEmailServer({
		to,
		subject: params.subject,
		message: params.text,
		html: params.html
	});

	if (ok) {
		await ensureDb()
			.insert(table.invStockAlertEmailSentTable)
			.values({
				hospitalId: params.hospitalId,
				storeId: params.storeId,
				recipientStaffId: params.staffId,
				eventType: params.eventType,
				payloadDigest: digest
			});
	} else {
		log.warn('Stock alert email send failed (check SMTP logs)', {
			staffId: params.staffId,
			eventType: params.eventType
		});
	}
}

function stockAlertEventType(
	base: 'inv_low_stock' | 'inv_expired' | 'inv_expiring_soon',
	storeId: number
): string {
	return `${base}__${storeId}`;
}

async function dispatchStoreScopedStockAlerts(params: {
	hospitalId: string;
	settings: Awaited<
		ReturnType<typeof loadStockAlertSettingsEffectiveDb>
	>;
	baselineSoon: number;
	sendEmail: boolean;
}): Promise<void> {
	const { hospitalId, settings, baselineSoon, sendEmail } = params;
	const recipients =
		await listActiveStockAlertRecipientSubscriptions(hospitalId);
	if (recipients.length === 0) return;

	const base = `/heka/hospital/${hospitalId}/home/inventory/reports`;

	for (const r of recipients) {
		const sid = r.storeId;
		const storeLabel = (r.storeName ?? '').trim() || `Store #${sid}`;

		const [lowStock, expired, expSoon] = await Promise.all([
			listLowStockDb({ hospitalId, storeId: sid, limit: 500 }),
			listExpiryLotsDb({
				hospitalId,
				storeId: sid,
				mode: 'expired',
				fallbackExpiringSoonDays: baselineSoon,
				limit: 200
			}),
			listExpiryLotsDb({
				hospitalId,
				storeId: sid,
				mode: 'expiringSoon',
				fallbackExpiringSoonDays: baselineSoon,
				limit: 200
			})
		]);

		const alerts: {
			count: number;
			eventType: string;
			severity: string;
			title: string;
			message: string;
			link: string;
			emailFlag: boolean;
			notifyProp: keyof Pick<
				typeof r,
				'notifyLowStock' | 'notifyExpired' | 'notifyExpiringSoon'
			>;
		}[] = [
			{
				count: lowStock.length,
				eventType: stockAlertEventType('inv_low_stock', sid),
				severity: StatusColorEnum.WARNING,
				title: 'Low stock',
				message: `${lowStock.length} item(s) are below the reorder level at ${storeLabel}.`,
				link: `${base}/low-stock?storeId=${sid}`,
				emailFlag: settings.emailLowStock,
				notifyProp: 'notifyLowStock'
			},
			{
				count: expired.length,
				eventType: stockAlertEventType('inv_expired', sid),
				severity: StatusColorEnum.ERROR,
				title: 'Expired stock',
				message: `${expired.length} lot(s) have expired at ${storeLabel}.`,
				link: `${base}/expired?mode=expired&storeId=${sid}`,
				emailFlag: settings.emailExpired,
				notifyProp: 'notifyExpired'
			},
			{
				count: expSoon.length,
				eventType: stockAlertEventType('inv_expiring_soon', sid),
				severity: StatusColorEnum.WARNING,
				title: 'Expiring soon',
				message: `${expSoon.length} lot(s) expire soon at ${storeLabel}.`,
				link: `${base}/expired?mode=soon&storeId=${sid}`,
				emailFlag: settings.emailExpiringSoon,
				notifyProp: 'notifyExpiringSoon'
			}
		];

		for (const a of alerts) {
			if (a.count <= 0 || !r[a.notifyProp]) continue;

			await maybeNotifyStaffInApp({
				staffId: r.staffId,
				hospitalId,
				eventType: a.eventType,
				severity: a.severity,
				title: a.title,
				message: a.message,
				link: a.link,
				minGapMinutes: settings.inAppMinGapMinutes
			});

			if (sendEmail && a.emailFlag) {
				try {
					const reportUrl = toAbsoluteAppUrl(a.link);
					const { html, plainText } = renderStockAlertEmail({
						metaTitle: `${a.title} · Heka`,
						title: a.title,
						body: a.message,
						url: reportUrl,
						ctaLabel: 'View inventory report'
					});
					await maybeSendStockAlertEmail({
						staffId: r.staffId,
						hospitalId,
						storeId: sid,
						eventType: a.eventType,
						minGapMinutes: settings.emailMinGapMinutes,
						subject: `[Heka] ${a.title}`,
						text: plainText,
						html
					});
				} catch (err) {
					log.error(
						'Stock alert email step failed (other alerts/stores continue)',
						err instanceof Error ? err : new Error(String(err))
					);
				}
			}
		}
	}
}

export type StockAlertsEvaluation = {
	summary: StockAlertsSummary;
	settings: Awaited<
		ReturnType<typeof loadStockAlertSettingsEffectiveDb>
	>;
	baselineSoon: number;
};

/**
 * Hospital-wide (or single-store) alert counts + settings — fast path without per-recipient dispatch.
 */
export async function evaluateStockAlertsForHospital(
	event: RequestEvent | null,
	input: {
		hospitalId: string;
		storeId?: number;
		daysSoonOverride?: number;
		/**
		 * When set, only these stores are counted (e.g. dashboard branch scope).
		 * Empty array → no matching rows (all zeros).
		 * Omitted → all stores in the hospital (cron/API behaviour).
		 */
		storeIdsInScope?: number[];
	}
): Promise<StockAlertsEvaluation> {
	const { hospitalId, storeId } = input;
	if (event) {
		await ensureHospitalInventoryAccess(event, hospitalId);
	}

	const settings =
		await loadStockAlertSettingsEffectiveDb(hospitalId);
	const baselineSoon =
		input.daysSoonOverride != null &&
		Number.isFinite(input.daysSoonOverride)
			? Math.min(365, Math.max(1, Math.floor(input.daysSoonOverride)))
			: settings.defaultExpiringSoonDays;

	const scopedStores =
		input.storeIdsInScope !== undefined
			? { storeIds: input.storeIdsInScope }
			: {};

	if (
		input.storeIdsInScope !== undefined &&
		input.storeIdsInScope.length === 0
	) {
		return {
			summary: {
				lowStockCount: 0,
				expiredLotCount: 0,
				expiringSoonLotCount: 0
			},
			settings,
			baselineSoon
		};
	}

	const [lowStock, expired, expSoon] = await Promise.all([
		listLowStockDb({
			hospitalId,
			storeId,
			limit: 500,
			...scopedStores
		}),
		listExpiryLotsDb({
			hospitalId,
			storeId,
			mode: 'expired',
			fallbackExpiringSoonDays: baselineSoon,
			limit: 200,
			...scopedStores
		}),
		listExpiryLotsDb({
			hospitalId,
			storeId,
			mode: 'expiringSoon',
			fallbackExpiringSoonDays: baselineSoon,
			limit: 200,
			...scopedStores
		})
	]);

	return {
		summary: {
			lowStockCount: lowStock.length,
			expiredLotCount: expired.length,
			expiringSoonLotCount: expSoon.length
		},
		settings,
		baselineSoon
	};
}

/** Runs per-store notifications/email without blocking the caller (e.g. home SSR). Errors are logged. */
export function scheduleStockAlertsDispatch(params: {
	hospitalId: string;
	settings: StockAlertsEvaluation['settings'];
	baselineSoon: number;
	sendEmail: boolean;
}): void {
	void dispatchStoreScopedStockAlerts(params).catch((err) =>
		log.error(
			'Background stock alerts dispatch failed',
			err instanceof Error ? err : new Error(String(err))
		)
	);
}

/**
 * Computes counts and optionally notifies configured recipients (in-app; email when `sendEmail`).
 * Pass `event` for authenticated UI flows; pass `null` from cron after verifying `CRON_SECRET`.
 */
export async function processStockAlerts(
	event: RequestEvent | null,
	input: {
		hospitalId: string;
		storeId?: number;
		daysSoonOverride?: number;
		sendEmail: boolean;
		storeIdsInScope?: number[];
	}
): Promise<StockAlertsSummary> {
	const ev = await evaluateStockAlertsForHospital(event, input);
	await dispatchStoreScopedStockAlerts({
		hospitalId: input.hospitalId,
		settings: ev.settings,
		baselineSoon: ev.baselineSoon,
		sendEmail: input.sendEmail
	});
	return ev.summary;
}

/**
 * Dashboard + pull API: inventory access + in-app dispatch.
 * Email is attempted per alert when Policy enables that alert’s email toggle (`emailFlag`); cron passes `sendEmail: false` to skip SMTP.
 */
export async function getStockAlertsSummaryAndNotify(
	event: RequestEvent,
	input: { hospitalId: string; storeId?: number; daysSoon?: number }
): Promise<StockAlertsSummary> {
	const ev = await evaluateStockAlertsForHospital(event, {
		hospitalId: input.hospitalId,
		storeId: input.storeId,
		daysSoonOverride: input.daysSoon
	});
	await dispatchStoreScopedStockAlerts({
		hospitalId: input.hospitalId,
		settings: ev.settings,
		baselineSoon: ev.baselineSoon,
		sendEmail: true
	});
	return ev.summary;
}

/** Cron / worker: all active hospitals; optional outbound email. No request auth. */
export async function runInventoryStockAlertsCronJobs(options: {
	sendEmail: boolean;
}): Promise<{ hospitalsProcessed: number }> {
	const hospitals = await ensureDb()
		.select({ id: table.hospitalTable.id })
		.from(table.hospitalTable)
		.where(
			and(
				eq(table.hospitalTable.statusId, StatusEnum.ACTIVE),
				isNull(table.hospitalTable.deletedAt)
			)
		);

	for (const h of hospitals) {
		await processStockAlerts(null, {
			hospitalId: h.id,
			sendEmail: options.sendEmail
		});
	}

	return { hospitalsProcessed: hospitals.length };
}
