import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	AccommodationBillingPolicySchema,
	IpdBedStaySegmentSchema
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	AccommodationBillingCareSetting,
	AccommodationChargeLine,
	AccommodationBillingPolicyRow
} from '$lib/model/type/medora/ipd/ipd.type';
import { money, computeDailyRate } from '$lib/server/medora/ipd/tariff.server';
import {
	assertActiveTimelineUnitId,
	getTimelineUnitMeta
} from '$lib/server/medora/administration/timeline-unit.server';
import {
	DEFAULT_TIMELINE_DURATION_DAYS,
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

export const DEFAULT_LEAST_BILL_DURATION_QTY = '1';

function effectiveLeastBillDurationQty(value: string | null | undefined): string {
	const raw = value != null && String(value).trim() !== '' ? String(value).trim() : null;
	return raw ?? DEFAULT_LEAST_BILL_DURATION_QTY;
}

/** Block size in hours from billing-setup qty × timeline unit only. */
export function resolveLeastBillBlockHours(input: {
	leastBillDuration: string | number | null | undefined;
	unitDurationDays: number;
}): number {
	const qty = Number(effectiveLeastBillDurationQty(input.leastBillDuration));
	const unitDays = input.unitDurationDays;
	if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitDays) || unitDays <= 0) {
		return 0;
	}
	return qty * timelineDurationDaysToHours(unitDays);
}

export type TimelineUnitMetaLite = {
	name: string;
	durationDays: number;
};

export type StaySegmentBillingPolicyInput = {
	leastBillDuration: string;
	leastBillDurationUnitId: number | null;
};

/** Live hospital IP/ED accommodation policy (same for every stay segment). */
export function resolveStaySegmentBillingPolicy(
	hospitalPolicy: AccommodationBillingPolicySchema
): StaySegmentBillingPolicyInput {
	return {
		leastBillDuration: effectiveLeastBillDurationQty(
			hospitalPolicy.leastBillDuration
		),
		leastBillDurationUnitId: hospitalPolicy.accommodationBillUnitId ?? null
	};
}

export function computeSegmentActualHours(
	startedAt: string,
	endedAt: string
): number {
	const start = parseUtcInstant(startedAt);
	const end = parseUtcInstant(endedAt);
	if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
		return 0;
	}
	return (
		Math.round(((end - start) / (3600 * 1000)) * 10000) / 10000
	);
}

export function accommodationChargePricingAudit(input: {
	charge: AccommodationChargeLine;
	actualHours: number;
	billableHours: number;
}): Record<string, unknown> {
	return {
		kind: 'ipd_accommodation',
		segmentId: input.charge.segmentId,
		startedAt: input.charge.startedAt,
		endedAt: input.charge.endedAt,
		actualHours: input.actualHours,
		billableHours: input.billableHours,
		dailyTariff: input.charge.dailyTariff,
		amount: input.charge.amount,
		billableUnits: input.charge.billableUnits,
		unitPrice: input.charge.unitPrice
	};
}

/** Bed tariff snapshots only; bill unit comes from accommodation policy. */
function segmentDailyTariffFromSnapshots(seg: IpdBedStaySegmentSchema): string {
	const durationDays =
		parseTimelineDurationDays(seg.timelineDurationDaysSnapshot) ??
		DEFAULT_TIMELINE_DURATION_DAYS;
	return computeDailyRate({
		bedBasePrice: seg.bedBasePriceSnapshot,
		roomMarkupPercent: seg.roomMarkupSnapshot,
		wardMarkupPercent: seg.wardMarkupSnapshot,
		timelineDurationDays: durationDays
	});
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
		return '';
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
	return name || '';
}

async function assertAccommodationBillUnitId(
	unitId: number | null
): Promise<number | null> {
	return assertActiveTimelineUnitId(unitId);
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

/** Billable hours for one segment (least block qty × timeline unit). */
export function computeSegmentBillableHours(input: {
	startedAt: string;
	endedAt: string;
	leastBillBlockHours: number;
	graceMinutes?: number;
}): number {
	const block = input.leastBillBlockHours;
	if (!Number.isFinite(block) || block <= 0) return 0;
	const hours = computeBillableHoursWithLeastBlock({
		startedAt: input.startedAt,
		endedAt: input.endedAt,
		graceMinutes: input.graceMinutes ?? 0,
		leastBillDurationHours: block
	});
	return Math.round(hours * 10000) / 10000;
}

/** Billable day-equivalents for one segment. */
export function computeSegmentBillableDays(input: {
	startedAt: string;
	endedAt: string;
	leastBillBlockHours: number;
	graceMinutes?: number;
}): number {
	return Math.round((computeSegmentBillableHours(input) / 24) * 10000) / 10000;
}

export async function getOrCreateBillingPolicy(input: {
	hospitalId: string;
	careSetting?: AccommodationBillingCareSetting;
}): Promise<AccommodationBillingPolicySchema> {
	const careSetting = parseAccommodationCareSetting(
		input.careSetting ?? 'IP'
	);
	const db = ensureDb();
	const [existing] = await db
		.select()
		.from(table.accommodationBillingPolicyTable)
		.where(
			and(
				eq(
					table.accommodationBillingPolicyTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.accommodationBillingPolicyTable.careSetting,
					careSetting
				)
			)
		)
		.limit(1);
	if (existing) return existing;
	const [created] = await db
		.insert(table.accommodationBillingPolicyTable)
		.values({
			hospitalId: input.hospitalId,
			careSetting,
			leastBillDuration: DEFAULT_LEAST_BILL_DURATION_QTY
		})
		.returning();
	if (!created) throw new Error('Policy create failed');
	return created;
}

export async function updateBillingPolicy(input: {
	hospitalId: string;
	careSetting?: AccommodationBillingCareSetting;
	leastBillDuration?: string | null;
	accommodationServiceItemId?: number | null;
	accommodationBillUnitId?: number | null;
}): Promise<AccommodationBillingPolicyRow> {
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
	const leastBillDuration =
		input.leastBillDuration !== undefined
			? effectiveLeastBillDurationQty(input.leastBillDuration)
			: effectiveLeastBillDurationQty(current.leastBillDuration);
	const [row] = await ensureDb()
		.update(table.accommodationBillingPolicyTable)
		.set({
			leastBillDuration,
			accommodationServiceItemId: serviceItemId,
			accommodationBillUnitId
		})
		.where(
			eq(table.accommodationBillingPolicyTable.id, current.id)
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

export function buildAccommodationChargeLines(input: {
	segments: IpdBedStaySegmentSchema[];
	hospitalPolicy: AccommodationBillingPolicySchema;
	asOf: string;
	unitMetaById: Map<number, TimelineUnitMetaLite>;
}): AccommodationChargeLine[] {
	const lines: AccommodationChargeLine[] = [];

	const segmentPolicy = resolveStaySegmentBillingPolicy(input.hospitalPolicy);
	const billUnitId = input.hospitalPolicy.accommodationBillUnitId;
	const unitMeta =
		billUnitId != null ? input.unitMetaById.get(billUnitId) ?? null : null;
	if (!unitMeta) return lines;

	for (const seg of input.segments) {
		const endedAt = seg.endedAt ?? input.asOf;
		const blockHours = resolveLeastBillBlockHours({
			leastBillDuration: segmentPolicy.leastBillDuration,
			unitDurationDays: unitMeta.durationDays
		});
		if (blockHours <= 0) continue;
		const actualHours = computeSegmentActualHours(
			seg.startedAt,
			endedAt
		);
		const billableHours = computeSegmentBillableHours({
			startedAt: seg.startedAt,
			endedAt,
			leastBillBlockHours: blockHours
		});
		if (billableHours <= 0) continue;
		const days = Math.round((billableHours / 24) * 10000) / 10000;
		const dailyRate = segmentDailyTariffFromSnapshots(seg);
		const billLabel = unitMeta.name;
		const billDuration = unitMeta.durationDays;
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
			unitPrice,
			actualHours,
			billableHours
		});
	}
	return lines;
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
	if (policy.accommodationBillUnitId == null) {
		return [];
	}
	const segments = await listStaySegments(input);
	const billUnitMeta = await getTimelineUnitMeta(policy.accommodationBillUnitId);
	const unitMetaById = new Map<number, TimelineUnitMetaLite>([
		[
			policy.accommodationBillUnitId,
			{
				name: billUnitMeta.name,
				durationDays: billUnitMeta.durationDays
			}
		]
	]);
	const asOf = input.asOf ?? toUtcIsoString();
	return buildAccommodationChargeLines({
		segments,
		hospitalPolicy: policy,
		asOf,
		unitMetaById
	});
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
	const unitLabel = input.charge.basePriceUnitLabel.trim();
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
		.select({
			lineIndex: table.ipBillingLineTable.lineIndex,
			segmentId: table.ipBillingLineTable.ipdBedStaySegmentId
		})
		.from(table.ipBillingLineTable)
		.where(eq(table.ipBillingLineTable.ipBillingId, input.ipBillingId));
	const postedSegmentIds = new Set(
		existing
			.map((r) => r.segmentId)
			.filter((id): id is number => id != null)
	);
	let nextIndex =
		existing.reduce((m, r) => Math.max(m, r.lineIndex), 0) + 1;

	let subtotal = 0;
	await db.transaction(async (tx) => {
		for (const charge of charges) {
			if (postedSegmentIds.has(charge.segmentId)) continue;
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
					lineTotal: charge.amount,
					ipdBedStaySegmentId: charge.segmentId,
					pricingInputsSnapshot: accommodationChargePricingAudit({
						charge,
						actualHours: charge.actualHours ?? 0,
						billableHours: charge.billableHours ?? 0
					})
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
