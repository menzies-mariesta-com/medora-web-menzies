import { error, type RequestEvent } from '@sveltejs/kit';
import {
	and,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	min,
	or,
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

const PHARMACY_CATEGORY_ID = 12;

export async function getFinancialYearIdToday(
	hospitalId: string
): Promise<number> {
	const db = ensureDb();
	const today = new Date();
	const [fy] = await db
		.select({ id: table.financialYearTable.id })
		.from(table.financialYearTable)
		.where(
			and(
				eq(table.financialYearTable.hospitalId, hospitalId),
				sql`${table.financialYearTable.startDate} <= ${today}`,
				sql`${table.financialYearTable.endDate} >= ${today}`,
				isNull(table.financialYearTable.deletedAt)
			)
		)
		.limit(1);
	if (!fy) throw error(400, 'Financial year is not configured for this hospital.');
	return fy.id;
}

export async function searchStores(
	event: RequestEvent,
	hospitalId: string,
	name?: string
) {
	await ensureCanAccessHospital(event, hospitalId);
	const db = ensureDb();
	const branches = await db
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(eq(table.hospitalBranchTable.hospitalId, hospitalId));
	const branchIds = branches.map((b) => b.id);
	if (branchIds.length === 0) return [] as { id: number; storeName: string | null }[];

	const wh = and(
		inArray(table.storeTable.branchId, branchIds),
		eq(table.storeTable.statusId, StatusEnum.ACTIVE)
	);
	const nameWh =
		name?.trim() != null && name.trim() !== ''
			? ilike(table.storeTable.storeName, `%${name.trim()}%`)
			: undefined;
	return await db
		.select({
			id: table.storeTable.id,
			storeName: table.storeTable.storeName
		})
		.from(table.storeTable)
		.where(and(wh, nameWh))
		.orderBy(table.storeTable.storeName)
		.limit(100);
}

/** Item name + min batch purchase price (display) for pharmacy items in stock at store. */
export async function searchItemNamePrice(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId: number;
		search?: string;
		pharmacyGenericId?: number | null;
		limit?: number;
	}
) {
	const { hospitalId, storeId, search, pharmacyGenericId } = input;
	const limit = input.limit ?? 80;
	await ensureCanAccessHospital(event, hospitalId);
	if (!Number.isFinite(storeId) || storeId <= 0) throw error(400, 'storeId is required');

	// prove store belongs to hospital
	const branches = await ensureDb()
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(eq(table.hospitalBranchTable.hospitalId, hospitalId));
	const branchIds = branches.map((b) => b.id);
	const [st] = await ensureDb()
		.select({ id: table.storeTable.id })
		.from(table.storeTable)
		.where(
			and(
				eq(table.storeTable.id, storeId),
				inArray(table.storeTable.branchId, branchIds)
			)
		)
		.limit(1);
	if (!st) throw error(400, 'Invalid store for this hospital');

	const q = search?.trim() ? `%${search.trim()}%` : null;
	const gen =
		pharmacyGenericId != null && Number.isFinite(pharmacyGenericId)
			? pharmacyGenericId
			: null;
	const im = table.itemMasterTable;
	const inv = table.invStockTable;
	const ib = table.itemBatchTable;
	const wh = and(
		eq(inv.storeId, storeId),
		eq(im.hospitalId, hospitalId),
		eq(im.categoryId, PHARMACY_CATEGORY_ID),
		sql`cast(${inv.quantity} as numeric) > 0`,
		eq(im.statusId, StatusEnum.ACTIVE),
		isNull(im.deletedAt),
		gen != null ? eq(im.pharmacyGenericId, gen) : undefined,
		q != null ? ilike(im.itemName, q) : undefined
	);
	const rows = await ensureDb()
		.select({
			id: im.id,
			itemName: im.itemName,
			displayPrice: min(ib.purchasePrice)
		})
		.from(inv)
		.innerJoin(ib, eq(inv.batchId, ib.id))
		.innerJoin(im, eq(inv.itemId, im.id))
		.where(wh)
		.groupBy(im.id, im.itemName)
		.orderBy(im.itemName)
		.limit(limit);
	return rows.map((r) => ({
		id: r.id,
		itemName: r.itemName,
		displayPrice: r.displayPrice != null ? String(r.displayPrice) : null
	}));
}

export async function saveMedicationOrderBatch(
	event: RequestEvent,
	input: {
		hospitalId: string;
		visitId: number;
		storeId: number;
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
	const { hospitalId, visitId, storeId, lines } = input;
	await ensureCanAccessHospital(event, hospitalId);
	if (!Array.isArray(lines) || lines.length === 0) {
		throw error(400, 'At least one line is required');
	}

	const userId = event.locals.user?.id ?? null;
	const db = ensureDb();
	const now = new Date();
	const startLimit = now.toISOString();

	const [v] = await db
		.select()
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, visitId),
				eq(table.patientVisitTable.hospitalId, hospitalId)
			)
		)
		.limit(1);
	if (!v) throw error(400, 'Visit not found for this hospital');

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
				visitId,
				storeId,
				batchNo,
				extCustomerName: null,
				advisingDoctor: null,
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

/**
 * “Reorder”: create a **new** batch (new batch number) with a single line copied from the
 * **first** line of `sourceBatchId`, with `startAt` = after the latest line end on this visit
 * (max of start + duration over all existing non-deleted lines). If that time would be in the
 * past, it is nudged to satisfy “start not in the past” validation. Does not use the UI draft.
 */
export async function reorderFromHistoryBatch(
	event: RequestEvent,
	input: { hospitalId: string; visitId: number; sourceBatchId: number }
) {
	const { hospitalId, visitId, sourceBatchId } = input;
	await ensureCanAccessHospital(event, hospitalId);
	if (!Number.isFinite(visitId) || visitId <= 0) {
		throw error(400, 'visitId is required');
	}
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
				eq(mob.visitId, visitId),
				isNull(mob.deletedAt)
			)
		)
		.limit(1);
	if (!srcBatch) throw error(404, 'Batch not found for this visit');

	const [firstLine] = await db
		.select()
		.from(mol)
		.where(
			and(eq(mol.batchId, sourceBatchId), isNull(mol.deletedAt))
		)
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
				isNull(
					table.medOrderDurationUnitInactiveTable.durationUnitId
				)
			) as any
		)
		.orderBy(
			table.medOrderDurationUnitTable.sequenceNo,
			table.medOrderDurationUnitTable.id
		);
	if (durUnits.length === 0) {
		throw error(400, 'Duration units are not configured for this hospital');
	}

	const visitLines = await db
		.select({
			startAt: mol.startAt,
			durationValue: mol.durationValue,
			durationUnitId: mol.durationUnitId
		})
		.from(mol)
		.innerJoin(mob, eq(mol.batchId, mob.id))
		.where(
			and(
				eq(mob.visitId, visitId),
				eq(mob.hospitalId, hospitalId),
				isNull(mob.deletedAt),
				isNull(mol.deletedAt)
			)
		);

	if (visitLines.length === 0) {
		throw error(500, 'No medication order lines found for this visit');
	}

	let maxEndMs = 0;
	for (const row of visitLines) {
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

	return await saveMedicationOrderBatch(event, {
		hospitalId,
		visitId,
		storeId: srcBatch.storeId,
		lines: [newLine]
	});
}

export async function listBatchesByVisit(
	event: RequestEvent,
	hospitalId: string,
	visitId: number
) {
	await ensureCanAccessHospital(event, hospitalId);
	if (!Number.isFinite(visitId) || visitId <= 0) {
		throw error(400, 'visitId is required');
	}
	const db = ensureDb();
	const b = table.medicationOrderBatchTable;
	const uCreat = alias(table.userTable, 'mob_created_by');
	const uUpd = alias(table.userTable, 'mob_updated_by');
	const lineCounts = db
		.select({
			batchId: table.medicationOrderLineTable.batchId,
			lineCount: count().as('lineCount')
		})
		.from(table.medicationOrderLineTable)
		.where(isNull(table.medicationOrderLineTable.deletedAt))
		.groupBy(table.medicationOrderLineTable.batchId)
		.as('mob_line_counts');

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
			createdByName: sql<string | null>`coalesce(${uCreat.name}, ${uCreat.email})`,
			updatedByName: sql<string | null>`coalesce(${uUpd.name}, ${uUpd.email})`,
			lineCount: sql<number>`coalesce(${lineCounts.lineCount}, 0)`.mapWith(Number)
		})
		.from(b)
		.leftJoin(uCreat, eq(b.createdBy, uCreat.id))
		.leftJoin(uUpd, eq(b.updatedBy, uUpd.id))
		.leftJoin(lineCounts, eq(b.id, lineCounts.batchId))
		.where(
			and(
				eq(b.hospitalId, hospitalId),
				eq(b.visitId, visitId),
				isNull(b.deletedAt)
			)
		)
		.orderBy(desc(b.id));
}

export async function getBatchWithLines(
	event: RequestEvent,
	hospitalId: string,
	batchId: number
) {
	await ensureCanAccessHospital(event, hospitalId);
	const db = ensureDb();
	const [batch] = await db
		.select()
		.from(table.medicationOrderBatchTable)
		.where(
			and(
				eq(table.medicationOrderBatchTable.id, batchId),
				eq(table.medicationOrderBatchTable.hospitalId, hospitalId),
				isNull(table.medicationOrderBatchTable.deletedAt)
			)
		);
	if (!batch) return null;
	const lines = await db
		.select()
		.from(table.medicationOrderLineTable)
		.where(
			and(
				eq(table.medicationOrderLineTable.batchId, batchId),
				isNull(table.medicationOrderLineTable.deletedAt)
			)
		)
		.orderBy(table.medicationOrderLineTable.lineNo);
	return { batch, lines };
}

export async function updateMedicationOrderBatch(
	event: RequestEvent,
	input: {
		hospitalId: string;
		batchId: number;
		lines: Array<{
			id?: number;
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
	const { hospitalId, batchId, lines } = input;
	await ensureCanAccessHospital(event, hospitalId);
	if (!Array.isArray(lines) || lines.length === 0) {
		throw error(400, 'At least one line is required');
	}
	const userId = event.locals.user?.id ?? null;
	const now = new Date();
	const db = ensureDb();
	const [batch] = await db
		.select()
		.from(table.medicationOrderBatchTable)
		.where(
			and(
				eq(table.medicationOrderBatchTable.id, batchId),
				eq(table.medicationOrderBatchTable.hospitalId, hospitalId),
				isNull(table.medicationOrderBatchTable.deletedAt)
			)
		);
	if (!batch) throw error(404, 'Batch not found');

	for (const ln of lines) {
		if (new Date(ln.startAt).getTime() < now.getTime() - 30_000) {
			throw error(400, 'Start date/time must not be in the past');
		}
	}

	await db.transaction(async (tx) => {
		await tx
			.update(table.medicationOrderLineTable)
			.set({ deletedAt: new Date().toISOString(), deletedBy: userId })
			.where(
				and(
					eq(table.medicationOrderLineTable.batchId, batchId),
					isNull(table.medicationOrderLineTable.deletedAt)
				)
			);

		let lineNo = 1;
		for (const ln of lines) {
			await tx.insert(table.medicationOrderLineTable).values({
				batchId,
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
		await tx
			.update(table.medicationOrderBatchTable)
			.set({
				updatedBy: userId,
				updatedAt: new Date().toISOString()
			})
			.where(eq(table.medicationOrderBatchTable.id, batchId));
	});
	return { ok: true };
}

export async function deleteMedicationOrderBatch(
	event: RequestEvent,
	hospitalId: string,
	batchId: number
) {
	await ensureCanAccessHospital(event, hospitalId);
	const userId = event.locals.user?.id ?? null;
	const now = new Date().toISOString();
	const delLine = { deletedAt: now, deletedBy: userId } as const;
	const delBatch = { deletedAt: now, deletedBy: userId } as const;
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
	await db.transaction(async (tx) => {
		await tx
			.update(table.medicationOrderLineTable)
			.set(delLine)
			.where(
				and(
					eq(table.medicationOrderLineTable.batchId, batchId),
					isNull(table.medicationOrderLineTable.deletedAt)
				)
			);
		await tx
			.update(table.medicationOrderBatchTable)
			.set(delBatch)
			.where(eq(table.medicationOrderBatchTable.id, batchId));
	});
	return { ok: true };
}

export async function listMastersForInternalForm(
	event: RequestEvent,
	hospitalId: string
) {
	await ensureCanAccessHospital(event, hospitalId);
	const db = ensureDb();
	const [forms, routes, orderTypes, doseUnits, foodRels, durUnits, freqs] =
		await Promise.all([
			db
				.select({ id: table.medOrderFormTable.id, name: table.medOrderFormTable.name })
				.from(table.medOrderFormTable)
				.leftJoin(
					table.medOrderFormInactiveTable,
					and(
						eq(
							table.medOrderFormInactiveTable.formId,
							table.medOrderFormTable.id
						),
						eq(
							table.medOrderFormInactiveTable.hospitalId,
							hospitalId
						)
					) as any
				)
				.where(
					and(
						isNull(table.medOrderFormTable.deletedAt),
						isNull(table.medOrderFormInactiveTable.formId)
					) as any
				)
				.orderBy(table.medOrderFormTable.name),
			db
				.select({ id: table.medOrderRouteTable.id, name: table.medOrderRouteTable.name })
				.from(table.medOrderRouteTable)
				.leftJoin(
					table.medOrderRouteInactiveTable,
					and(
						eq(
							table.medOrderRouteInactiveTable.routeId,
							table.medOrderRouteTable.id
						),
						eq(
							table.medOrderRouteInactiveTable.hospitalId,
							hospitalId
						)
					) as any
				)
				.where(
					and(
						isNull(table.medOrderRouteTable.deletedAt),
						isNull(table.medOrderRouteInactiveTable.routeId)
					) as any
				)
				.orderBy(table.medOrderRouteTable.name),
			db
				.select({
					id: table.medOrderOrderTypeTable.id,
					name: table.medOrderOrderTypeTable.name
				})
				.from(table.medOrderOrderTypeTable)
				.leftJoin(
					table.medOrderOrderTypeInactiveTable,
					and(
						eq(
							table.medOrderOrderTypeInactiveTable.orderTypeId,
							table.medOrderOrderTypeTable.id
						),
						eq(
							table.medOrderOrderTypeInactiveTable.hospitalId,
							hospitalId
						)
					) as any
				)
				.where(
					and(
						isNull(table.medOrderOrderTypeTable.deletedAt),
						isNull(table.medOrderOrderTypeInactiveTable.orderTypeId)
					) as any
				)
				.orderBy(table.medOrderOrderTypeTable.name),
			db
				.select({ id: table.medOrderDoseUnitTable.id, name: table.medOrderDoseUnitTable.name })
				.from(table.medOrderDoseUnitTable)
				.leftJoin(
					table.medOrderDoseUnitInactiveTable,
					and(
						eq(
							table.medOrderDoseUnitInactiveTable.doseUnitId,
							table.medOrderDoseUnitTable.id
						),
						eq(
							table.medOrderDoseUnitInactiveTable.hospitalId,
							hospitalId
						)
					) as any
				)
				.where(
					and(
						isNull(table.medOrderDoseUnitTable.deletedAt),
						isNull(table.medOrderDoseUnitInactiveTable.doseUnitId)
					) as any
				)
				.orderBy(table.medOrderDoseUnitTable.name),
			db
				.select({
					id: table.medOrderFoodRelationTable.id,
					name: table.medOrderFoodRelationTable.name
				})
				.from(table.medOrderFoodRelationTable)
				.leftJoin(
					table.medOrderFoodRelationInactiveTable,
					and(
						eq(
							table.medOrderFoodRelationInactiveTable.foodRelationId,
							table.medOrderFoodRelationTable.id
						),
						eq(
							table.medOrderFoodRelationInactiveTable.hospitalId,
							hospitalId
						)
					) as any
				)
				.where(
					and(
						isNull(table.medOrderFoodRelationTable.deletedAt),
						isNull(
							table.medOrderFoodRelationInactiveTable.foodRelationId
						)
					) as any
				)
				.orderBy(table.medOrderFoodRelationTable.name),
			db
				.select({
					id: table.medOrderDurationUnitTable.id,
					code: table.medOrderDurationUnitTable.code,
					name: table.medOrderDurationUnitTable.name
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
						isNull(
							table.medOrderDurationUnitInactiveTable.durationUnitId
						)
					) as any
				)
				.orderBy(
					table.medOrderDurationUnitTable.sequenceNo,
					table.medOrderDurationUnitTable.id
				),
			db
				.select({
					id: table.medOrderFrequencyTable.id,
					label: table.medOrderFrequencyTable.label,
					summaryText: table.medOrderFrequencyTable.summaryText
				})
				.from(table.medOrderFrequencyTable)
				.leftJoin(
					table.medOrderFrequencyInactiveTable,
					and(
						eq(
							table.medOrderFrequencyInactiveTable.frequencyId,
							table.medOrderFrequencyTable.id
						),
						eq(
							table.medOrderFrequencyInactiveTable.hospitalId,
							hospitalId
						)
					) as any
				)
				.where(
					and(
						isNull(table.medOrderFrequencyTable.deletedAt),
						isNull(table.medOrderFrequencyInactiveTable.frequencyId)
					) as any
				)
				.orderBy(table.medOrderFrequencyTable.label)
		]);
	return { forms, routes, orderTypes, doseUnits, foodRels, durUnits, freqs };
}
