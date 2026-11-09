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
	AccommodationBillingCareSetting,
	AccommodationChargeLine,
	IpdAccommodationBillingPolicyRow
} from '$lib/model/type/medora/ipd/ipd.type';
import { money, computeDailyRate } from '$lib/server/medora/ipd/tariff.server';
import { getTimelineUnitMeta } from '$lib/server/medora/administration/timeline-unit.server';
import {
	DEFAULT_TIMELINE_DURATION_DAYS,
	DEFAULT_TIMELINE_UNIT_LABEL,
	parseTimelineDurationDays,
	timelineDurationDaysToHours
} from '$lib/util/timeline-duration-days.util';
import { normalizeIpBillingLineWrite, toDbMoney2dp } from '$lib/server/medora/money-normalize.server';
import { parseUtcInstant, toUtcIsoString } from '$lib/util/utc-instant.util';
import { updateHospitalEdBillingConfig } from '$lib/server/medora/ed/hospital-ed-billing-config.server';
import { and, asc, eq } from 'drizzle-orm';

export function parseAccommodationCareSetting(
	value: unknown
): AccommodationBillingCareSetting {
	const v = String(value ?? '')
		.trim()
		.toUpperCase();
	if (v === 'ED' || v === 'ER') return 'ED';
	return 'IP';
}

/** Fallback when a segment snapshot has no unit name. */
export const ACCOMMODATION_BILL_UNIT_LABEL_FALLBACK = DEFAULT_TIMELINE_UNIT_LABEL;

/** Unit and daily rate come only from the stay segment snapshots. */
function segmentBillingFromSnapshots(seg: IpdBedStaySegmentSchema): {
	basePriceUnitLabel: string;
	durationDays: number;
	dailyRate: string;
} {
	const basePriceUnitLabel =
		seg.basePriceUnitNameSnapshot?.trim() ||
		ACCOMMODATION_BILL_UNIT_LABEL_FALLBACK;
	const durationDays =
		parseTimelineDurationDays(seg.timelineDurationDaysSnapshot) ??
		DEFAULT_TIMELINE_DURATION_DAYS;
	const dailyRate = computeDailyRate({
		bedBasePrice: seg.bedBasePriceSnapshot,
		roomMarkupPercent: seg.roomMarkupSnapshot,
		wardMarkupPercent: seg.wardMarkupSnapshot,
		timelineDurationDays: durationDays
	});
	return { basePriceUnitLabel, durationDays, dailyRate };
}

function billableUnitsFromHours(
	billableHours: number,
	unitDurationDays: number
): number {
	const unitHours = timelineDurationDaysToHours(unitDurationDays);
	if (unitHours <= 0) return billableHours;
	return Math.round((billableHours / unitHours) * 10000) / 10000;
}

export async function resolveAccommodationBillUnitLabel(
	accommodationBillUnitId: number | null | undefined
): Promise<string> {
	if (accommodationBillUnitId == null) {
		return ACCOMMODATION_BILL_UNIT_LABEL_FALLBACK;
	}
	const [row] = await ensureDb()
		.select({ name: table.unitTable.name })
		.from(table.unitTable)
		.where(
			and(
				eq(table.unitTable.id, accommodationBillUnitId),
				eq(table.unitTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	const name = row?.name?.trim();
	return name || ACCOMMODATION_BILL_UNIT_LABEL_FALLBACK;
}

async function assertAccommodationBillUnitId(
	unitId: number | null
): Promise<number | null> {
	if (unitId == null) return null;
	if (!Number.isFinite(unitId) || unitId <= 0) {
		throw error(400, 'Invalid accommodation bill unit');
	}
	const [row] = await ensureDb()
		.select({ id: table.unitTable.id })
		.from(table.unitTable)
		.where(
			and(
				eq(table.unitTable.id, unitId),
				eq(table.unitTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	if (!row) {
		throw error(400, 'Accommodation bill unit not found or not active');
	}
	return unitId;
}

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

/** Bill stay length in hours, rounded up to least-duration blocks. */
export function computeBillableHoursWithLeastBlock(input: {
	startedAt: string;
	endedAt: string;
	graceMinutes: number;
	leastBillDurationHours: number;
}): number {
	const start = parseUtcInstant(input.startedAt);
	const end = parseUtcInstant(input.endedAt);
	if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
		return 0;
	}
	const graceMs = input.graceMinutes * 60 * 1000;
	const stayMs = Math.max(0, end - start - graceMs);
	if (stayMs <= 0) return 0;
	const stayHours = stayMs / (3600 * 1000);
	const block = input.leastBillDurationHours;
	if (!Number.isFinite(block) || block <= 0) return stayHours;
	return Math.ceil(stayHours / block) * block;
}

/** Billable hours for one segment under hospital policy. */
export function computeSegmentBillableHours(input: {
	startedAt: string;
	endedAt: string;
	method: number;
	graceMinutes: number;
	minimumDays: string | null;
	cutoffTime: string;
	leastBillDurationHours?: string | null;
}): number {
	const leastRaw = input.leastBillDurationHours;
	const least =
		leastRaw != null && leastRaw !== '' ? Number(leastRaw) : null;
	if (least != null && Number.isFinite(least) && least > 0) {
		let hours = computeBillableHoursWithLeastBlock({
			startedAt: input.startedAt,
			endedAt: input.endedAt,
			graceMinutes: input.graceMinutes,
			leastBillDurationHours: least
		});
		const min =
			input.minimumDays != null && input.minimumDays !== ''
				? Number(input.minimumDays)
				: null;
		if (min != null && Number.isFinite(min) && hours > 0 && hours < min * 24) {
			hours = min * 24;
		}
		return Math.round(hours * 10000) / 10000;
	}

	const start = parseUtcInstant(input.startedAt);
	const end = parseUtcInstant(input.endedAt);
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
		const startDate = new Date(start);
		const endDate = new Date(end);
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
	return Math.round(days * 24 * 10000) / 10000;
}

/** Billable days for one segment under hospital policy. */
export function computeSegmentBillableDays(input: {
	startedAt: string;
	endedAt: string;
	method: number;
	graceMinutes: number;
	minimumDays: string | null;
	cutoffTime: string;
	leastBillDurationHours?: string | null;
}): number {
	const hours = computeSegmentBillableHours(input);
	return Math.round((hours / 24) * 10000) / 10000;
}

export async function getOrCreateBillingPolicy(input: {
	hospitalId: string;
	careSetting?: AccommodationBillingCareSetting;
}): Promise<IpdAccommodationBillingPolicySchema> {
	const careSetting = parseAccommodationCareSetting(
		input.careSetting ?? 'IP'
	);
	const db = ensureDb();
	const [existing] = await db
		.select()
		.from(table.ipdAccommodationBillingPolicyTable)
		.where(
			and(
				eq(
					table.ipdAccommodationBillingPolicyTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.ipdAccommodationBillingPolicyTable.careSetting,
					careSetting
				)
			)
		)
		.limit(1);
	if (existing) return existing;
	const [created] = await db
		.insert(table.ipdAccommodationBillingPolicyTable)
		.values({
			hospitalId: input.hospitalId,
			careSetting,
			billingMethod: IpdAccommodationBillingMethodEnum.BLOCK_24H
		})
		.returning();
	if (!created) throw new Error('Policy create failed');
	return created;
}

export async function updateBillingPolicy(input: {
	hospitalId: string;
	careSetting?: AccommodationBillingCareSetting;
	billingMethod?: number;
	graceMinutes?: number;
	minimumDays?: string | null;
	cutoffTime?: string;
	leastBillDurationHours?: string | null;
	accommodationServiceItemId?: number | null;
	accommodationBillUnitId?: number | null;
}): Promise<IpdAccommodationBillingPolicyRow> {
	const careSetting = parseAccommodationCareSetting(
		input.careSetting ?? 'IP'
	);
	const current = await getOrCreateBillingPolicy({
		hospitalId: input.hospitalId,
		careSetting
	});
	let accommodationBillUnitId = current.accommodationBillUnitId ?? null;
	if (input.accommodationBillUnitId !== undefined) {
		accommodationBillUnitId = await assertAccommodationBillUnitId(
			input.accommodationBillUnitId
		);
	}
	const serviceItemId =
		input.accommodationServiceItemId !== undefined
			? input.accommodationServiceItemId
			: current.accommodationServiceItemId;
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
			leastBillDurationHours:
				input.leastBillDurationHours !== undefined
					? input.leastBillDurationHours
					: current.leastBillDurationHours,
			cutoffTime:
				input.cutoffTime !== undefined
					? input.cutoffTime
					: current.cutoffTime,
			accommodationServiceItemId: serviceItemId,
			accommodationBillUnitId
		})
		.where(
			eq(table.ipdAccommodationBillingPolicyTable.id, current.id)
		)
		.returning();
	if (!row) throw new Error('Policy update failed');
	if (careSetting === 'ED' && input.accommodationServiceItemId !== undefined) {
		await updateHospitalEdBillingConfig({
			hospitalId: input.hospitalId,
			erBedServiceItemId: input.accommodationServiceItemId
		});
	}
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
	let policyBillUnit: { name: string; durationDays: number } | null = null;
	if (policy.accommodationBillUnitId != null) {
		try {
			const meta = await getTimelineUnitMeta(policy.accommodationBillUnitId);
			policyBillUnit = {
				name: meta.name,
				durationDays: meta.durationDays
			};
		} catch {
			policyBillUnit = null;
		}
	}
	const segments = await listStaySegments(input);
	const asOf = input.asOf ?? toUtcIsoString();
	const lines: AccommodationChargeLine[] = [];

	for (const seg of segments) {
		const endedAt = seg.endedAt ?? asOf;
		const billableHours = computeSegmentBillableHours({
			startedAt: seg.startedAt,
			endedAt,
			method: policy.billingMethod,
			graceMinutes: policy.graceMinutes,
			minimumDays: policy.minimumDays,
			cutoffTime: policy.cutoffTime,
			leastBillDurationHours: policy.leastBillDurationHours
		});
		if (billableHours <= 0) continue;
		const days = Math.round((billableHours / 24) * 10000) / 10000;
		const { basePriceUnitLabel, durationDays, dailyRate } =
			segmentBillingFromSnapshots(seg);
		const billLabel = policyBillUnit?.name ?? basePriceUnitLabel;
		const billDuration = policyBillUnit?.durationDays ?? durationDays;
		const unitHours = timelineDurationDaysToHours(billDuration);
		const daily = Number(dailyRate);
		const billableUnits = billableUnitsFromHours(
			billableHours,
			billDuration
		);
		const unitPrice = money((daily * unitHours) / 24);
		const amount = money((daily * billableHours) / 24);
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
			dailyTariff: dailyRate,
			amount,
			bedBasePrice: money(seg.bedBasePriceSnapshot),
			roomMarkup: money(seg.roomMarkupSnapshot),
			wardMarkup: money(seg.wardMarkupSnapshot),
			startedAt: seg.startedAt,
			endedAt,
			basePriceUnitLabel: billLabel,
			billableUnits,
			unitPrice
		});
	}
	return lines;
}

/** Bill line qty/price for accommodation: N days × daily tariff. */
export function accommodationChargeToPendingBillFields(input: {
	charge: AccommodationChargeLine;
	serviceItemName: string;
}): {
	serviceName: string;
	serviceAmount: string;
	serviceUnit: number;
	serviceUnitLabel: string;
	serviceTaxAmount: string;
	discount: string;
} {
	const base = input.serviceItemName.trim() || 'Accommodation';
	const serviceName = `${base}: ${input.charge.label}`.slice(0, 512);
	const unitLabel =
		input.charge.basePriceUnitLabel.trim() ||
		ACCOMMODATION_BILL_UNIT_LABEL_FALLBACK;
	return {
		serviceName,
		serviceAmount: input.charge.unitPrice,
		serviceUnit: input.charge.billableUnits,
		serviceUnitLabel: unitLabel,
		serviceTaxAmount: '0',
		discount: '0'
	};
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
			const fields = accommodationChargeToPendingBillFields({
				charge,
				serviceItemName: serviceName
			});
			await tx.insert(table.ipBillingLineTable).values(
				normalizeIpBillingLineWrite({
					ipBillingId: input.ipBillingId,
					lineIndex: nextIndex++,
					serviceId,
					serviceNameSnapshot: fields.serviceName,
					discount: fields.discount,
					serviceAmount: fields.serviceAmount,
					serviceTaxAmount: fields.serviceTaxAmount,
					serviceUnit: fields.serviceUnit,
					lineTotal: charge.amount
				})
			);
			subtotal += Number(toDbMoney2dp(charge.amount));
		}
		const newSub = money(Number(bill.linesSubtotal ?? 0) + subtotal);
		await tx
			.update(table.ipBillingTable)
			.set({ linesSubtotal: newSub })
			.where(eq(table.ipBillingTable.id, input.ipBillingId));
	});

	return { lineCount: charges.length, subtotal: money(subtotal) };
}
