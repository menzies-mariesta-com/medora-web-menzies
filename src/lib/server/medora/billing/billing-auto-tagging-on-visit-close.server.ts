import { and, desc, eq, inArray, isNotNull, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum, VisitTypeEnum } from '$lib/model/enum/db-link';
import { BillingSetupCareSettingEnum } from '$lib/model/enum/billing-setup-care-setting.enum';
import { generatePrefix } from '$lib/server/medora/prefix/prefix-generator.server';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { getActiveBillingSetupTaggingsForCareSetting } from '$lib/server/medora/administration/billing-setup/billing-setup-service-tagging.server';
import { normalizeMoneyDecimal2dpOrZero } from '$lib/server/medora/money-field.server';
import { isTaggingEffectiveOnDate } from '$lib/server/medora/billing/service-tagging-effective.server';

function toDateOnly(value: string | null | undefined): string | null {
	const str = (value ?? '').trim();
	if (!str) return null;
	return str.length >= 10 ? str.slice(0, 10) : str;
}

export function careSettingForVisitTypeId(
	visitTypeId: number | null | undefined
): BillingSetupCareSettingEnum | null {
	if (visitTypeId === VisitTypeEnum.IPD) {
		return BillingSetupCareSettingEnum.IP;
	}
	if (visitTypeId === VisitTypeEnum.ED) {
		return BillingSetupCareSettingEnum.ER;
	}
	if (visitTypeId == null) return null;
	return BillingSetupCareSettingEnum.OP;
}

/**
 * Uses billing_setup_service_tagging FK rows (not duplicate taggings).
 * Adds nursing-complete service order lines when a visit in OP / IP / ER is done.
 */
export async function applyBillingAutoTaggingsOnVisitClose(input: {
	hospitalId: string;
	visitId: string;
	userId: string;
	careSetting: BillingSetupCareSettingEnum;
	closeDate?: string;
}): Promise<number> {
	const closeDate =
		toDateOnly(input.closeDate) ??
		new Date().toISOString().slice(0, 10);

	const [visit] = await ensureDb()
		.select({
			id: table.patientVisitTable.id,
			branchId: table.patientVisitTable.branchId,
			visitTypeId: table.patientVisitTable.visitTypeId
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!visit?.branchId) return 0;

	const expected = careSettingForVisitTypeId(visit.visitTypeId);
	if (expected !== input.careSetting) return 0;

	const linked = await getActiveBillingSetupTaggingsForCareSetting({
		hospitalId: input.hospitalId,
		careSetting: input.careSetting,
		branchId: visit.branchId
	});

	const pending = linked
		.map((row) => row.tagging)
		.filter((tagging) => isTaggingEffectiveOnDate(tagging, closeDate));

	if (pending.length === 0) return 0;

	const serviceIds = pending.map((t) => t.serviceId);
	const existingLines = await ensureDb()
		.select({ serviceId: table.serviceOrderDetailTable.serviceId })
		.from(table.serviceOrderDetailTable)
		.innerJoin(
			table.serviceOrderTable,
			eq(
				table.serviceOrderDetailTable.serviceOrderId,
				table.serviceOrderTable.id
			)
		)
		.where(
			and(
				eq(table.serviceOrderTable.visitId, input.visitId),
				ne(table.serviceOrderTable.statusId, StatusEnum.DELETED),
				ne(
					table.serviceOrderDetailTable.statusId,
					StatusEnum.DELETED
				),
				isNotNull(table.serviceOrderDetailTable.nursingCompleteTime),
				inArray(table.serviceOrderDetailTable.serviceId, serviceIds)
			)
		);
	const already = new Set(existingLines.map((r) => r.serviceId));
	const toInsert = pending.filter((t) => !already.has(t.serviceId));
	if (toInsert.length === 0) return 0;

	const now = new Date();
	const orderDate = closeDate;
	const orderTime = now.toTimeString().slice(0, 8);
	const nowIso = now.toISOString();

	return ensureDb().transaction(async (tx) => {
		let serviceOrderId: number;
		const [existingOrder] = await tx
			.select({ id: table.serviceOrderTable.id })
			.from(table.serviceOrderTable)
			.where(
				and(
					eq(table.serviceOrderTable.visitId, input.visitId),
					ne(table.serviceOrderTable.statusId, StatusEnum.DELETED)
				)
			)
			.orderBy(desc(table.serviceOrderTable.id))
			.limit(1);

		if (existingOrder) {
			serviceOrderId = existingOrder.id;
		} else {
			const [fy] = await tx
				.select({ id: table.financialYearTable.id })
				.from(table.financialYearTable)
				.where(
					eq(table.financialYearTable.hospitalId, input.hospitalId)
				)
				.orderBy(desc(table.financialYearTable.endDate))
				.limit(1);
			if (!fy) return 0;

			const orderNo = await generatePrefix({
				hospitalId: input.hospitalId,
				branchId: visit.branchId!,
				financialYearId: fy.id,
				prefixKey: PREFIX_PURPOSE_STORAGE.ORDER_NO,
				context: {
					visitTypeId: visit.visitTypeId ?? undefined,
					orderDate,
					visitId: input.visitId,
					visitNo: null
				}
			});

			const [order] = await tx
				.insert(table.serviceOrderTable)
				.values({
					branchId: visit.branchId!,
					visitId: input.visitId,
					orderDate,
					orderTime,
					orderNo,
					createdBy: input.userId,
					updatedBy: input.userId
				})
				.returning({ id: table.serviceOrderTable.id });
			if (!order) return 0;
			serviceOrderId = order.id;
		}

		let inserted = 0;
		for (const tagging of toInsert) {
			await tx.insert(table.serviceOrderDetailTable).values({
				serviceOrderId,
				serviceId: tagging.serviceId,
				serviceAmount: normalizeMoneyDecimal2dpOrZero(tagging.serviceAmount),
				serviceTaxAmount: normalizeMoneyDecimal2dpOrZero(
					tagging.serviceTaxAmount
				),
				serviceUnit: 1,
				nursingCompleteTime: nowIso,
				statusId: StatusEnum.ACTIVE,
				createdBy: input.userId,
				updatedBy: input.userId
			});
			inserted += 1;
		}
		return inserted;
	});
}

export async function applyBillingAutoTaggingsForVisit(input: {
	hospitalId: string;
	visitId: string;
	userId: string;
	closeDate?: string;
}): Promise<number> {
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
	if (!careSetting) return 0;
	return applyBillingAutoTaggingsOnVisitClose({
		...input,
		careSetting
	});
}

/** @deprecated Billing setup lines are synced on bill load into op/ip_billing_line, not service orders. */
export async function ensureBillingSetupAutoLinesForVisit(_input: {
	hospitalId: string;
	visitId: string;
	userId: string;
	closeDate?: string;
}): Promise<number> {
	return 0;
}
