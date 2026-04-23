import { error, type RequestEvent } from '@sveltejs/kit';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { generatePrefix } from '$lib/server/heka/prefix/prefix-generator.server';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	getFinancialYearIdToday,
	updateMedicationOrderBatch,
	deleteMedicationOrderBatch
} from './medication-order-internal.server';

export {
	listMastersForInternalForm,
	searchStores,
	searchItemNamePrice
} from './medication-order-internal.server';

export { getBatchWithLines } from './medication-order-internal.server';

export async function listExternalBatches(event: RequestEvent, hospitalId: string) {
	await ensureCanAccessHospital(event, hospitalId);
	return await ensureDb()
		.select()
		.from(table.medicationOrderBatchTable)
		.where(
			and(
				eq(table.medicationOrderBatchTable.hospitalId, hospitalId),
				isNull(table.medicationOrderBatchTable.visitId),
				isNull(table.medicationOrderBatchTable.deletedAt)
			)
		)
		.orderBy(desc(table.medicationOrderBatchTable.id))
		.limit(200);
}

export async function saveMedicationOrderBatchExternal(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId: number;
		extCustomerName: string;
		advisingDoctor: string;
		lines: Array<{
			itemMasterId: number;
			dose: string;
			doseUnitId: number;
			frequencyId: number;
			durationValue: string;
			durationUnitId: number;
			formId: number | null;
			routeId: number | null;
			orderTypeId: number | null;
			foodRelationId: number | null;
			startAt: string;
			testDose: string | null;
			substituteNotAllowed: boolean;
		}>;
	}
) {
	const { hospitalId, storeId, lines } = input;
	const extCustomerName = input.extCustomerName.trim();
	const advisingDoctor = input.advisingDoctor.trim();
	await ensureCanAccessHospital(event, hospitalId);
	if (extCustomerName.length === 0 || advisingDoctor.length === 0) {
		throw error(400, 'Customer name and advising doctor are required');
	}
	if (extCustomerName.length > 512 || advisingDoctor.length > 512) {
		throw error(400, 'Name or doctor is too long');
	}
	if (!Array.isArray(lines) || lines.length === 0) {
		throw error(400, 'At least one line is required');
	}

	const userId = event.locals.user?.id ?? null;
	const db = ensureDb();
	const now = new Date();
	const startLimit = now.toISOString();

	const branches = await db
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(eq(table.hospitalBranchTable.hospitalId, hospitalId));
	const branchIds = branches.map((b) => b.id);
	const [st] = await db
		.select()
		.from(table.storeTable)
		.where(
			and(
				eq(table.storeTable.id, storeId),
				inArray(table.storeTable.branchId, branchIds)
			)
		)
		.limit(1);
	if (!st) throw error(400, 'Invalid store');

	for (const ln of lines) {
		if (new Date(ln.startAt).getTime() < now.getTime() - 30_000) {
			throw error(400, 'Start date/time must not be in the past');
		}
	}

	const financialYearId = await getFinancialYearIdToday(hospitalId);
	const batchNo = await generatePrefix({
		hospitalId,
		branchId: null,
		financialYearId,
		prefixKey: PREFIX_PURPOSE_STORAGE.MEDICATION_ORDER_BATCH_NO,
		context: {}
	});

	return await db.transaction(async (tx) => {
		const [batch] = await tx
			.insert(table.medicationOrderBatchTable)
			.values({
				hospitalId,
				visitId: null,
				storeId,
				batchNo,
				extCustomerName,
				advisingDoctor,
				createdBy: userId,
				updatedBy: userId
			})
			.returning();
		if (!batch) throw error(500, 'Failed to create batch');
		let lineNo = 1;
		for (const ln of lines) {
			if (new Date(ln.startAt) < new Date(startLimit)) {
				throw error(400, 'Start date/time must not be in the past');
			}
			await tx.insert(table.medicationOrderLineTable).values({
				batchId: batch.id,
				lineNo: lineNo++,
				itemMasterId: ln.itemMasterId,
				dose: ln.dose,
				doseUnitId: ln.doseUnitId,
				frequencyId: ln.frequencyId,
				durationValue: ln.durationValue,
				durationUnitId: ln.durationUnitId,
				formId: ln.formId,
				routeId: ln.routeId,
				orderTypeId: ln.orderTypeId,
				foodRelationId: ln.foodRelationId,
				startAt: ln.startAt,
				testDose: ln.testDose,
				substituteNotAllowed: ln.substituteNotAllowed,
				createdBy: userId,
				updatedBy: userId
			});
		}
		return { batch, batchNo };
	});
}

export async function updateMedicationOrderBatchExternal(
	event: RequestEvent,
	input: Parameters<typeof updateMedicationOrderBatch>[1]
) {
	const db = ensureDb();
	const [b] = await db
		.select()
		.from(table.medicationOrderBatchTable)
		.where(
			and(
				eq(table.medicationOrderBatchTable.id, input.batchId),
				eq(table.medicationOrderBatchTable.hospitalId, input.hospitalId),
				isNull(table.medicationOrderBatchTable.deletedAt)
			)
		);
	if (!b) throw error(404, 'Batch not found');
	if (b.visitId != null) {
		throw error(400, 'This batch is not an external sale order');
	}
	return updateMedicationOrderBatch(event, input);
}

export async function deleteMedicationOrderBatchExternal(
	event: RequestEvent,
	hospitalId: string,
	batchId: number
) {
	const db = ensureDb();
	const [b] = await db
		.select()
		.from(table.medicationOrderBatchTable)
		.where(
			and(
				eq(table.medicationOrderBatchTable.id, batchId),
				eq(table.medicationOrderBatchTable.hospitalId, hospitalId)
			)
		);
	if (!b) throw error(404, 'Not found');
	if (b.visitId != null) {
		throw error(400, 'This batch is not an external sale order');
	}
	return deleteMedicationOrderBatch(event, hospitalId, batchId);
}
