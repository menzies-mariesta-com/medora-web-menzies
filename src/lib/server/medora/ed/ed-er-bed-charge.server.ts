import { and, desc, eq, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { getOrCreateHospitalEdBillingConfig } from './hospital-ed-billing-config.server';
import { generatePrefix } from '$lib/server/medora/prefix/prefix-generator.server';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';

/**
 * Idempotent: ensures one auto ER bed service line exists for the encounter.
 */
export async function ensureErBedChargeServiceLine(input: {
	hospitalId: string;
	visitId: string;
	userId: string;
}): Promise<number | null> {
	const config = await getOrCreateHospitalEdBillingConfig(input.hospitalId);
	const serviceItemId = config.erBedServiceItemId;
	if (serviceItemId == null || serviceItemId <= 0) return null;

	const enc = await ensureDb().query.edEncounterTable.findFirst({
		where: (t, { and: a, eq: e }) =>
			a(e(t.hospitalId, input.hospitalId), e(t.visitId, input.visitId))
	});
	if (!enc) return null;
	if (
		enc.erBedChargeServiceOrderDetailId != null &&
		enc.erBedChargeServiceOrderDetailId > 0
	) {
		return enc.erBedChargeServiceOrderDetailId;
	}

	const [visit] = await ensureDb()
		.select()
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!visit?.branchId) return null;

	const [svc] = await ensureDb()
		.select({
			id: table.serviceItemTable.id,
			serviceAmount: table.serviceItemTable.serviceAmount,
			serviceTaxAmount: table.serviceItemTable.serviceTaxAmount
		})
		.from(table.serviceItemTable)
		.where(
			and(
				eq(table.serviceItemTable.id, serviceItemId),
				eq(table.serviceItemTable.hospitalId, input.hospitalId),
				eq(table.serviceItemTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	if (!svc) return null;

	const now = new Date();
	const orderDate = now.toISOString().slice(0, 10);
	const orderTime = now.toTimeString().slice(0, 8);

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
				.where(eq(table.financialYearTable.hospitalId, input.hospitalId))
				.orderBy(desc(table.financialYearTable.endDate))
				.limit(1);
			if (!fy) return null;

			const orderNo = await generatePrefix({
				hospitalId: input.hospitalId,
				branchId: visit.branchId!,
				financialYearId: fy.id,
				prefixKey: PREFIX_PURPOSE_STORAGE.ORDER_NO,
				context: {
					visitTypeId: visit.visitTypeId ?? undefined,
					orderDate,
					visitId: input.visitId,
					visitNo: visit.visitNo ?? null
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
			if (!order) return null;
			serviceOrderId = order.id;
		}

		const nowIso = now.toISOString();
		const [detail] = await tx
			.insert(table.serviceOrderDetailTable)
			.values({
				serviceOrderId,
				serviceId: svc.id,
				serviceAmount: svc.serviceAmount ?? '0',
				serviceTaxAmount: svc.serviceTaxAmount ?? '0',
				serviceUnit: 1,
				nursingCompleteTime: nowIso,
				statusId: StatusEnum.ACTIVE,
				createdBy: input.userId,
				updatedBy: input.userId
			})
			.returning({ id: table.serviceOrderDetailTable.id });
		if (!detail) return null;

		await tx
			.update(table.edEncounterTable)
			.set({
				erBedChargeServiceOrderDetailId: detail.id,
				updatedAt: nowIso
			})
			.where(eq(table.edEncounterTable.id, enc.id));

		return detail.id;
	});
}
