import { and, eq, inArray } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { getActiveBillingSetupTaggingsForCareSetting } from '$lib/server/medora/administration/billing-setup/billing-setup-service-tagging.server';
import {
	careSettingForVisitTypeId
} from '$lib/server/medora/billing/billing-auto-tagging-on-visit-close.server';
import { isTaggingEffectiveOnDate } from '$lib/server/medora/billing/service-tagging-effective.server';
import { normalizeMoneyDecimal2dpOrZero } from '$lib/server/medora/money-field.server';
import type { OpBillingPendingLineRow } from '$lib/server/medora/observation/observation-emr.server';

export type OpBillingPendingBillingSetupLineRow = {
	lineSource: 'billing_setup';
	/** `billing_setup_service_tagging.id` */
	id: number;
	medicationOrderLineId: null;
	departmentConsumptionLineId: null;
	serviceId: number;
	serviceName: string | null;
	subCategoryId: number | null;
	subCategoryName: string | null;
	categoryName: string | null;
	orderNo: string | null;
	discount: string | null;
	serviceAmount: string | null;
	serviceTaxAmount: string | null;
	serviceUnit: number | null;
};

export type OpBillingPendingAccommodationLineRow = {
	lineSource: 'ipd_accommodation';
	/** `ipd_bed_stay_segment.id` */
	id: number;
	medicationOrderLineId: null;
	departmentConsumptionLineId: null;
	serviceId: number;
	serviceName: string | null;
	subCategoryId: number | null;
	subCategoryName: string | null;
	categoryName: string | null;
	orderNo: string | null;
	discount: string | null;
	serviceAmount: string | null;
	serviceTaxAmount: string | null;
	serviceUnit: number | null;
	serviceUnitLabel?: string | null;
	pricingInputsSnapshot?: Record<string, unknown> | null;
};

export type PendingBillLineRow =
	| OpBillingPendingLineRow
	| OpBillingPendingBillingSetupLineRow
	| OpBillingPendingAccommodationLineRow;

export function isBillingSetupPendingLine(
	row: PendingBillLineRow
): row is OpBillingPendingBillingSetupLineRow {
	return row.lineSource === 'billing_setup';
}

export function dedupePendingBillRows(
	rows: PendingBillLineRow[]
): PendingBillLineRow[] {
	const seen = new Set<string>();
	const out: PendingBillLineRow[] = [];
	for (const r of rows) {
		const key =
			r.lineSource === 'billing_setup'
				? `setup:${r.id}`
				: r.lineSource === 'medication_order_line'
					? `med:${r.medicationOrderLineId}`
					: r.lineSource === 'department_consumption_line'
						? `dc:${r.departmentConsumptionLineId}`
						: r.lineSource === 'ipd_accommodation'
							? `acc:${r.id}`
							: `svc:${r.id}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(r);
	}
	return out;
}

/** Billing-setup taggings as bill lines (not service orders). */
export async function getBillingSetupPendingBillLinesForVisit(input: {
	hospitalId: string;
	visitId: string;
	branchId: string;
	asOfDate?: string;
}): Promise<OpBillingPendingBillingSetupLineRow[]> {
	const asOf =
		(input.asOfDate ?? '').trim().slice(0, 10) ||
		new Date().toISOString().slice(0, 10);

	const [visit] = await ensureDb()
		.select({ visitTypeId: table.patientVisitTable.visitTypeId })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	const careSetting = careSettingForVisitTypeId(visit?.visitTypeId);
	if (!careSetting) return [];

	const linked = await getActiveBillingSetupTaggingsForCareSetting({
		hospitalId: input.hospitalId,
		careSetting,
		branchId: input.branchId
	});
	const effective = linked.filter((row) =>
		isTaggingEffectiveOnDate(row.tagging, asOf)
	);
	if (effective.length === 0) return [];

	const serviceIds = [
		...new Set(effective.map((r) => r.tagging.serviceId))
	];
	const serviceRows =
		serviceIds.length === 0
			? []
			: await ensureDb()
					.select({
						id: table.serviceItemTable.id,
						serviceName: table.serviceItemTable.serviceName,
						subCategoryId: table.serviceItemTable.subCategoryId
					})
					.from(table.serviceItemTable)
					.where(
						and(
							inArray(table.serviceItemTable.id, serviceIds),
							eq(table.serviceItemTable.statusId, StatusEnum.ACTIVE)
						)
					);

	const subCategoryIds = [
		...new Set(
			serviceRows
				.map((s) => s.subCategoryId)
				.filter((id): id is number => id != null)
		)
	];
	const subRows =
		subCategoryIds.length === 0
			? []
			: await ensureDb()
					.select({
						id: table.subCategoryTable.id,
						name: table.subCategoryTable.subCategoryName,
						categoryId: table.subCategoryTable.categoryId
					})
					.from(table.subCategoryTable)
					.where(inArray(table.subCategoryTable.id, subCategoryIds));
	const categoryIds = [
		...new Set(
			subRows
				.map((s) => s.categoryId)
				.filter((id): id is number => id != null)
		)
	];
	const catRows =
		categoryIds.length === 0
			? []
			: await ensureDb()
					.select({
						id: table.categoryTable.id,
						name: table.categoryTable.categoryName
					})
					.from(table.categoryTable)
					.where(inArray(table.categoryTable.id, categoryIds));

	const serviceById = new Map(serviceRows.map((s) => [s.id, s]));
	const subNameById = new Map(subRows.map((s) => [s.id, s.name]));
	const categoryIdBySubId = new Map(
		subRows.map((s) => [s.id, s.categoryId])
	);
	const catNameById = new Map(catRows.map((c) => [c.id, c.name]));

	const seenService = new Set<number>();
	const out: OpBillingPendingBillingSetupLineRow[] = [];

	for (const { linkId, tagging } of effective) {
		if (seenService.has(tagging.serviceId)) continue;
		seenService.add(tagging.serviceId);

		const svc = serviceById.get(tagging.serviceId);
		const subCategoryId = svc?.subCategoryId ?? null;
		const subCategoryName =
			subCategoryId != null
				? (subNameById.get(subCategoryId) ?? null)
				: null;
		const categoryId =
			subCategoryId != null
				? categoryIdBySubId.get(subCategoryId)
				: undefined;
		const categoryName =
			categoryId != null
				? (catNameById.get(categoryId) ?? null)
				: null;

		out.push({
			lineSource: 'billing_setup',
			id: linkId,
			medicationOrderLineId: null,
			departmentConsumptionLineId: null,
			serviceId: tagging.serviceId,
			serviceName: svc?.serviceName?.trim() || null,
			subCategoryId,
			subCategoryName,
			categoryName,
			orderNo: null,
			discount: null,
			serviceAmount: normalizeMoneyDecimal2dpOrZero(tagging.serviceAmount),
			serviceTaxAmount: normalizeMoneyDecimal2dpOrZero(
				tagging.serviceTaxAmount
			),
			serviceUnit: 1
		});
	}

	return out;
}

export async function mergeClinicalAndBillingSetupPendingRows(input: {
	hospitalId: string;
	visitId: string;
	branchId: string;
	clinicalRows: OpBillingPendingLineRow[];
}): Promise<PendingBillLineRow[]> {
	const setupRows = await getBillingSetupPendingBillLinesForVisit({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		branchId: input.branchId
	});
	return dedupePendingBillRows([...input.clinicalRows, ...setupRows]);
}
