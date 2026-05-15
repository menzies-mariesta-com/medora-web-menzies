import { error, type RequestEvent } from '@sveltejs/kit';
import {
	and,
	count,
	desc,
	eq,
	inArray,
	isNull,
	sql
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { generatePrefix } from '$lib/server/heka/prefix/prefix-generator.server';
import { StatusEnum } from '$lib/model/enum/db-link';
import { addDurationToStart } from '$lib/util/med-order-stagger.util';
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

export async function listExternalBatches(
	event: RequestEvent,
	hospitalId: string
) {
	await ensureCanAccessHospital(event, hospitalId);
	const db = ensureDb();
	const b = table.medicationOrderBatchTable;
	const uCreat = alias(table.userTable, 'mob_ext_created_by');
	const uUpd = alias(table.userTable, 'mob_ext_updated_by');
	const lineCounts = db
		.select({
			batchId: table.medicationOrderLineTable.batchId,
			lineCount: count().as('lineCount')
		})
		.from(table.medicationOrderLineTable)
		.where(isNull(table.medicationOrderLineTable.deletedAt))
		.groupBy(table.medicationOrderLineTable.batchId)
		.as('mob_ext_line_counts');

	return await db
		.select({
			id: b.id,
			hospitalId: b.hospitalId,
			visitId: b.visitId,
			storeId: b.storeId,
			extCustomerName: b.extCustomerName,
			advisingDoctor: b.advisingDoctor,
			batchNo: b.batchNo,
			createdAt: b.createdAt,
			updatedAt: b.updatedAt,
			createdBy: b.createdBy,
			updatedBy: b.updatedBy,
			createdByName: sql<
				string | null
			>`coalesce(${uCreat.name}, ${uCreat.email})`,
			updatedByName: sql<
				string | null
			>`coalesce(${uUpd.name}, ${uUpd.email})`,
			lineCount:
				sql<number>`coalesce(${lineCounts.lineCount}, 0)`.mapWith(
					Number
				)
		})
		.from(b)
		.leftJoin(uCreat, eq(b.createdBy, uCreat.id))
		.leftJoin(uUpd, eq(b.updatedBy, uUpd.id))
		.leftJoin(lineCounts, eq(b.id, lineCounts.batchId))
		.where(
			and(
				eq(b.hospitalId, hospitalId),
				isNull(b.visitId),
				isNull(b.deletedAt)
			)
		)
		.orderBy(desc(b.id))
		.limit(200);
}

/**
 * Same idea as `reorderFromHistoryBatch` in internal, but for walk-in (visitId null) batches:
 * new batch uses first line of the source; start time is after the latest end among all
 * external (non-visit) lines for the hospital. Customer / doctor are copied from the source batch.
 */
export async function reorderFromHistoryBatchExternal(
	event: RequestEvent,
	input: { hospitalId: string; sourceBatchId: number }
) {
	const { hospitalId, sourceBatchId } = input;
	await ensureCanAccessHospital(event, hospitalId);
	if (!Number.isFinite(sourceBatchId) || sourceBatchId <= 0) {
		throw error(400, 'sourceBatchId is required');
	}

	const db = ensureDb();
	const mob = table.medicationOrderBatchTable;
	const mol = table.medicationOrderLineTable;

	const [srcBatch] = await db
		.select()
		.from(mob)
		.where(
			and(
				eq(mob.id, sourceBatchId),
				eq(mob.hospitalId, hospitalId),
				isNull(mob.visitId),
				isNull(mob.deletedAt)
			)
		)
		.limit(1);
	if (!srcBatch) throw error(404, 'Batch not found');
	const extCustomerName = (srcBatch.extCustomerName ?? '').trim();
	const advisingDoctor = (srcBatch.advisingDoctor ?? '').trim();
	if (!extCustomerName || !advisingDoctor) {
		throw error(400, 'Source batch is missing customer or doctor');
	}

	const [firstLine] = await db
		.select()
		.from(mol)
		.where(and(eq(mol.batchId, sourceBatchId), isNull(mol.deletedAt)))
		.orderBy(mol.lineNo)
		.limit(1);
	if (!firstLine) throw error(400, 'Batch has no lines');

	const durUnits = await db
		.select({
			id: table.medOrderDurationUnitTable.id,
			code: table.medOrderDurationUnitTable.code
		})
		.from(table.medOrderDurationUnitTable)
		.leftJoin(
			table.medOrderDurationUnitInactiveTable,
			and(
				eq(
					table.medOrderDurationUnitInactiveTable.durationUnitId,
					table.medOrderDurationUnitTable.id
				),
				eq(
					table.medOrderDurationUnitInactiveTable.hospitalId,
					hospitalId
				)
			) as any
		)
		.where(
			and(
				isNull(table.medOrderDurationUnitTable.deletedAt),
				isNull(table.medOrderDurationUnitInactiveTable.durationUnitId)
			) as any
		)
		.orderBy(
			table.medOrderDurationUnitTable.sequenceNo,
			table.medOrderDurationUnitTable.id
		);
	if (durUnits.length === 0) {
		throw error(
			400,
			'Duration units are not configured for this hospital'
		);
	}

	const externalLines = await db
		.select({
			startAt: mol.startAt,
			durationValue: mol.durationValue,
			durationUnitId: mol.durationUnitId
		})
		.from(mol)
		.innerJoin(mob, eq(mol.batchId, mob.id))
		.where(
			and(
				eq(mob.hospitalId, hospitalId),
				isNull(mob.visitId),
				isNull(mob.deletedAt),
				isNull(mol.deletedAt)
			)
		);

	if (externalLines.length === 0) {
		throw error(
			500,
			'No medication order lines found for external sales'
		);
	}

	let maxEndMs = 0;
	for (const row of externalLines) {
		const end = addDurationToStart(
			new Date(row.startAt),
			String(row.durationValue),
			row.durationUnitId,
			durUnits
		);
		if (end.getTime() > maxEndMs) maxEndMs = end.getTime();
	}
	const now = new Date();
	const minValidStartMs = now.getTime() - 25_000;
	const startMs = Math.max(maxEndMs, minValidStartMs);
	const newLine = {
		itemMasterId: firstLine.itemMasterId,
		dose: String(firstLine.dose),
		doseUnitId: firstLine.doseUnitId,
		frequencyId: firstLine.frequencyId,
		durationValue: String(firstLine.durationValue),
		durationUnitId: firstLine.durationUnitId,
		formId: firstLine.formId,
		routeId: firstLine.routeId,
		orderTypeId: firstLine.orderTypeId,
		foodRelationId: firstLine.foodRelationId,
		startAt: new Date(startMs).toISOString(),
		testDose: firstLine.testDose,
		substituteNotAllowed: firstLine.substituteNotAllowed
	};

	return await saveMedicationOrderBatchExternal(event, {
		hospitalId,
		storeId: srcBatch.storeId,
		extCustomerName,
		advisingDoctor,
		lines: [newLine]
	});
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
		throw error(
			400,
			'Customer name and advising doctor are required'
		);
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
				eq(
					table.medicationOrderBatchTable.hospitalId,
					input.hospitalId
				),
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
