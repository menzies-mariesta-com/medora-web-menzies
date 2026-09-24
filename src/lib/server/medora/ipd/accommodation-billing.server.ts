import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	IpdAccommodationBillingPolicySchema,
	IpdBedStaySegmentSchema
} from '$lib/server/db/schema-type';
import {
	IpdAccommodationBillingMethodEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import type {
	AccommodationChargeLine,
	IpdAccommodationBillingPolicyRow
} from '$lib/model/type/medora/ipd/ipd.type';
import { money } from '$lib/server/medora/ipd/tariff.server';
import { and, asc, eq } from 'drizzle-orm';

function parseCutoffMinutes(cutoffTime: string): number {
	const m = /^(\d{1,2}):(\d{2})$/.exec(cutoffTime.trim());
	if (!m) return 0;
	const h = Number(m[1]);
	const min = Number(m[2]);
	if (h < 0 || h > 23 || min < 0 || min > 59) return 0;
	return h * 60 + min;
}

function daysBetweenMs(startMs: number, endMs: number): number {
	return Math.max(0, (endMs - startMs) / (24 * 60 * 60 * 1000));
}

/** Billable days for one segment under hospital policy. */
export function computeSegmentBillableDays(input: {
	startedAt: string;
	endedAt: string;
	method: number;
	graceMinutes: number;
	minimumDays: string | null;
	cutoffTime: string;
}): number {
	const start = new Date(input.startedAt).getTime();
	const end = new Date(input.endedAt).getTime();
	if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
		return 0;
	}

	let days = 0;
	if (input.method === IpdAccommodationBillingMethodEnum.PRO_RATA) {
		days = daysBetweenMs(start, end);
	} else if (
		input.method === IpdAccommodationBillingMethodEnum.CALENDAR_DAY
	) {
		const cutoffMin = parseCutoffMinutes(input.cutoffTime);
		const startDate = new Date(input.startedAt);
		const endDate = new Date(input.endedAt);
		// Walk local calendar days; charge a day if any occupancy after cut-off on that day.
		const cursor = new Date(
			startDate.getFullYear(),
			startDate.getMonth(),
			startDate.getDate()
		);
		const last = new Date(
			endDate.getFullYear(),
			endDate.getMonth(),
			endDate.getDate()
		);
		while (cursor.getTime() <= last.getTime()) {
			const dayStart = new Date(cursor);
			const cut = new Date(cursor);
			cut.setHours(Math.floor(cutoffMin / 60), cutoffMin % 60, 0, 0);
			const next = new Date(cursor);
			next.setDate(next.getDate() + 1);
			const overlapStart = Math.max(start, dayStart.getTime());
			const overlapEnd = Math.min(end, next.getTime());
			if (overlapEnd > overlapStart) {
				// Grace: if leaving within grace after cut and started before cut same day
				const graceMs = input.graceMinutes * 60 * 1000;
				if (
					end <= cut.getTime() + graceMs &&
					start < cut.getTime() &&
					cursor.getTime() === last.getTime()
				) {
					// still count the day unless entirely before cut with grace — keep charged
				}
				days += 1;
			}
			cursor.setDate(cursor.getDate() + 1);
		}
	} else {
		// BLOCK_24H (default)
		const elapsedMs = end - start;
		const graceMs = input.graceMinutes * 60 * 1000;
		const blockMs = 24 * 60 * 60 * 1000;
		const adjusted = Math.max(0, elapsedMs - graceMs);
		days = Math.ceil(adjusted / blockMs) || (elapsedMs > 0 ? 1 : 0);
		if (elapsedMs > 0 && adjusted <= 0) days = 0;
		if (elapsedMs > 0 && days === 0 && graceMs === 0) {
			days = 1;
		}
	}

	const min =
		input.minimumDays != null && input.minimumDays !== ''
			? Number(input.minimumDays)
			: null;
	if (min != null && Number.isFinite(min) && days > 0 && days < min) {
		days = min;
	}
	return Math.round(days * 10000) / 10000;
}

export async function getOrCreateBillingPolicy(input: {
	hospitalId: string;
}): Promise<IpdAccommodationBillingPolicySchema> {
	const db = ensureDb();
	const [existing] = await db
		.select()
		.from(table.ipdAccommodationBillingPolicyTable)
		.where(
			eq(
				table.ipdAccommodationBillingPolicyTable.hospitalId,
				input.hospitalId
			)
		)
		.limit(1);
	if (existing) return existing;
	const [created] = await db
		.insert(table.ipdAccommodationBillingPolicyTable)
		.values({
			hospitalId: input.hospitalId,
			billingMethod: IpdAccommodationBillingMethodEnum.BLOCK_24H
		})
		.returning();
	if (!created) throw new Error('Policy create failed');
	return created;
}

export async function updateBillingPolicy(input: {
	hospitalId: string;
	billingMethod?: number;
	graceMinutes?: number;
	minimumDays?: string | null;
	cutoffTime?: string;
	accommodationServiceItemId?: number | null;
}): Promise<IpdAccommodationBillingPolicyRow> {
	const current = await getOrCreateBillingPolicy({
		hospitalId: input.hospitalId
	});
	const [row] = await ensureDb()
		.update(table.ipdAccommodationBillingPolicyTable)
		.set({
			billingMethod:
				input.billingMethod !== undefined
					? input.billingMethod
					: current.billingMethod,
			graceMinutes:
				input.graceMinutes !== undefined
					? input.graceMinutes
					: current.graceMinutes,
			minimumDays:
				input.minimumDays !== undefined
					? input.minimumDays
					: current.minimumDays,
			cutoffTime:
				input.cutoffTime !== undefined
					? input.cutoffTime
					: current.cutoffTime,
			accommodationServiceItemId:
				input.accommodationServiceItemId !== undefined
					? input.accommodationServiceItemId
					: current.accommodationServiceItemId
		})
		.where(
			eq(table.ipdAccommodationBillingPolicyTable.id, current.id)
		)
		.returning();
	if (!row) throw new Error('Policy update failed');
	return row;
}

export async function listStaySegments(input: {
	admissionId: number;
	hospitalId: string;
}): Promise<IpdBedStaySegmentSchema[]> {
	return ensureDb()
		.select()
		.from(table.ipdBedStaySegmentTable)
		.where(
			and(
				eq(table.ipdBedStaySegmentTable.admissionId, input.admissionId),
				eq(table.ipdBedStaySegmentTable.hospitalId, input.hospitalId)
			)
		)
		.orderBy(asc(table.ipdBedStaySegmentTable.startedAt));
}

export async function computeAccommodationCharges(input: {
	admissionId: number;
	hospitalId: string;
	/** Defaults to now for open segments. */
	asOf?: string;
}): Promise<AccommodationChargeLine[]> {
	const policy = await getOrCreateBillingPolicy({
		hospitalId: input.hospitalId
	});
	const segments = await listStaySegments(input);
	const asOf = input.asOf ?? new Date().toISOString();
	const lines: AccommodationChargeLine[] = [];

	for (const seg of segments) {
		const endedAt = seg.endedAt ?? asOf;
		const days = computeSegmentBillableDays({
			startedAt: seg.startedAt,
			endedAt,
			method: policy.billingMethod,
			graceMinutes: policy.graceMinutes,
			minimumDays: policy.minimumDays,
			cutoffTime: policy.cutoffTime
		});
		if (days <= 0) continue;
		const daily = Number(seg.dailyTariffSnapshot ?? 0);
		const amount = money(daily * days);
		const label = [
			seg.wardNameSnapshot,
			seg.roomNameSnapshot,
			seg.bedNameSnapshot
		]
			.filter(Boolean)
			.join(' · ');
		lines.push({
			segmentId: seg.id,
			label: label || `Segment #${seg.id}`,
			days,
			dailyTariff: money(seg.dailyTariffSnapshot),
			amount,
			bedBasePrice: money(seg.bedBasePriceSnapshot),
			roomMarkup: money(seg.roomMarkupSnapshot),
			wardMarkup: money(seg.wardMarkupSnapshot),
			startedAt: seg.startedAt,
			endedAt
		});
	}
	return lines;
}

/**
 * Post accommodation charge lines onto an existing draft IP bill.
 * Uses policy.accommodationServiceItemId when set; otherwise snapshot-only lines.
 */
export async function postAccommodationLinesToIpBill(input: {
	hospitalId: string;
	admissionId: number;
	ipBillingId: number;
}): Promise<{ lineCount: number; subtotal: string }> {
	const db = ensureDb();
	const [bill] = await db
		.select()
		.from(table.ipBillingTable)
		.where(
			and(
				eq(table.ipBillingTable.id, input.ipBillingId),
				eq(table.ipBillingTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!bill) throw error(404, 'IP bill not found');
	if (bill.admissionId && bill.admissionId !== input.admissionId) {
		throw error(400, 'Bill does not belong to this admission');
	}

	const policy = await getOrCreateBillingPolicy({
		hospitalId: input.hospitalId
	});
	const charges = await computeAccommodationCharges({
		admissionId: input.admissionId,
		hospitalId: input.hospitalId
	});
	if (charges.length === 0) {
		return { lineCount: 0, subtotal: '0.00' };
	}

	let serviceName = 'Accommodation';
	const serviceId = policy.accommodationServiceItemId;
	if (!serviceId) {
		throw error(
			400,
			'Configure an accommodation service item on IPD billing policy before posting'
		);
	}
	const [svc] = await db
		.select({
			id: table.serviceItemTable.id,
			name: table.serviceItemTable.serviceName
		})
		.from(table.serviceItemTable)
		.where(eq(table.serviceItemTable.id, serviceId))
		.limit(1);
	if (!svc) {
		throw error(400, 'Accommodation service item not found');
	}
	if (svc.name) serviceName = svc.name;

	const existing = await db
		.select({ lineIndex: table.ipBillingLineTable.lineIndex })
		.from(table.ipBillingLineTable)
		.where(eq(table.ipBillingLineTable.ipBillingId, input.ipBillingId));
	let nextIndex =
		existing.reduce((m, r) => Math.max(m, r.lineIndex), 0) + 1;

	let subtotal = 0;
	await db.transaction(async (tx) => {
		for (const charge of charges) {
			const remark = `${charge.label} · ${charge.days} day(s) @ ${charge.dailyTariff}`;
			await tx.insert(table.ipBillingLineTable).values({
				ipBillingId: input.ipBillingId,
				lineIndex: nextIndex++,
				serviceId,
				serviceNameSnapshot: `${serviceName}: ${remark}`.slice(
					0,
					512
				),
				discount: '0',
				serviceAmount: charge.amount,
				serviceTaxAmount: '0',
				serviceUnit: 1,
				lineTotal: charge.amount
			});
			subtotal += Number(charge.amount);
		}
		const newSub = money(Number(bill.linesSubtotal ?? 0) + subtotal);
		await tx
			.update(table.ipBillingTable)
			.set({ linesSubtotal: newSub })
			.where(eq(table.ipBillingTable.id, input.ipBillingId));
	});

	return { lineCount: charges.length, subtotal: money(subtotal) };
}
