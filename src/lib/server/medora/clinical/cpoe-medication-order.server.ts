import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq, ilike, inArray, isNull } from 'drizzle-orm';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { CategoryEnum, StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	getFinancialYearIdToday,
	listMastersForInternalForm,
	searchStores
} from '$lib/server/medora/medication-order/medication-order-internal.server';
import { generatePrefix } from '$lib/server/medora/prefix/prefix-generator.server';
import {
	requireClinicalStaff,
	requireConsultant
} from './clinical-authority.server';

export { listMastersForInternalForm, searchStores };

export async function searchMedicationItems(input: {
	hospitalId: string;
	search?: string;
}) {
	const query = input.search?.trim();
	return ensureDb()
		.select({
			id: table.itemMasterTable.id,
			itemName: table.itemMasterTable.itemName
		})
		.from(table.itemMasterTable)
		.where(
			and(
				eq(table.itemMasterTable.hospitalId, input.hospitalId),
				eq(table.itemMasterTable.statusId, StatusEnum.ACTIVE),
				isNull(table.itemMasterTable.deletedAt),
				query
					? ilike(table.itemMasterTable.itemName, `%${query}%`)
					: undefined,
				inArray(table.itemMasterTable.categoryId, [
					CategoryEnum.PHARMACY_SUPPLY,
					CategoryEnum.MEDICAL_SUPPLY
				])
			)
		)
		.orderBy(table.itemMasterTable.itemName)
		.limit(50);
}

export type DraftMedicationLine = {
	itemMasterId: number;
	dose: string;
	doseUnitId: number;
	frequencyId: number;
	durationValue: string;
	durationUnitId: number;
	formId?: number | null;
	routeId?: number | null;
	orderTypeId?: number | null;
	foodRelationId?: number | null;
	startAt?: string;
	lineRemarks?: string | null;
};

export async function createDraftMedicationOrder(
	event: RequestEvent,
	input: {
		hospitalId: string;
		visitId: number;
		storeId: number;
		lines: DraftMedicationLine[];
	}
) {
	await ensureCanAccessHospital(event, input.hospitalId);
	const staff = requireClinicalStaff(event);
	if (!input.lines.length)
		throw error(400, 'At least one medication is required');
	const db = ensureDb();
	const [visit] = await db
		.select({ branchId: table.patientVisitTable.branchId })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');
	const [store] = await db
		.select({ id: table.storeTable.id })
		.from(table.storeTable)
		.innerJoin(
			table.hospitalBranchTable,
			eq(table.storeTable.branchId, table.hospitalBranchTable.id)
		)
		.where(
			and(
				eq(table.storeTable.id, input.storeId),
				eq(table.hospitalBranchTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!store) throw error(400, 'Store is required');

	const financialYearId = await getFinancialYearIdToday(
		input.hospitalId
	);
	const batchNo = await generatePrefix({
		hospitalId: input.hospitalId,
		branchId: visit.branchId,
		financialYearId,
		prefixKey: PREFIX_PURPOSE_STORAGE.MEDICATION_ORDER_BATCH_NO,
		context: { visitId: input.visitId }
	});
	return db.transaction(async (tx) => {
		const [batch] = await tx
			.insert(table.medicationOrderBatchTable)
			.values({
				hospitalId: input.hospitalId,
				visitId: input.visitId,
				storeId: input.storeId,
				batchNo,
				batchRemarks: 'CPOE_DRAFT',
				orderingStaffId: staff.id,
				createdBy: event.locals.user?.id ?? null,
				updatedBy: event.locals.user?.id ?? null
			})
			.returning();
		if (!batch) throw error(500, 'Unable to create medication order');
		await tx.insert(table.medicationOrderLineTable).values(
			input.lines.map((line, index) => ({
				batchId: batch.id,
				lineNo: index + 1,
				itemMasterId: line.itemMasterId,
				dose: line.dose,
				doseUnitId: line.doseUnitId,
				frequencyId: line.frequencyId,
				durationValue: line.durationValue,
				durationUnitId: line.durationUnitId,
				formId: line.formId ?? null,
				routeId: line.routeId ?? null,
				orderTypeId: line.orderTypeId ?? null,
				foodRelationId: line.foodRelationId ?? null,
				startAt: line.startAt ?? new Date().toISOString(),
				lineRemarks: line.lineRemarks ?? null,
				createdBy: event.locals.user?.id ?? null,
				updatedBy: event.locals.user?.id ?? null
			}))
		);
		return batch;
	});
}

export async function cosignMedicationOrder(
	event: RequestEvent,
	input: { hospitalId: string; batchId: number }
) {
	const consultantId = requireConsultant(event);
	const [row] = await ensureDb()
		.update(table.medicationOrderBatchTable)
		.set({
			consultantCosignedAt: new Date(),
			consultantCosignedBy: consultantId
		})
		.where(
			and(
				eq(table.medicationOrderBatchTable.id, input.batchId),
				eq(
					table.medicationOrderBatchTable.hospitalId,
					input.hospitalId
				)
			)
		)
		.returning();
	if (!row) throw error(404, 'Medication order not found');
	return row;
}
