import { error, type RequestEvent } from '@sveltejs/kit';
import {
	and,
	count,
	desc,
	eq,
	inArray,
	isNotNull,
	isNull,
	sql
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { generatePrefix } from '$lib/server/medora/prefix/prefix-generator.server';
import {
	BillingStatusTaggingEnum,
	StatusEnum,
	VisitTypeEnum
} from '$lib/model/enum/db-link';
import { EXTERNAL_SALES_PRICING_MODULE } from '$lib/model/type/medora/inv-pricing-module.type';
import { isMedOrderStartBeforeToday } from '$lib/tool/medication-order/med-order-start-date.util';
import { addDurationToStart } from '$lib/util/med-order-stagger.util';
import { uuidV7 } from '$lib/util/id.util';
import { createPatientWithUserInHospital } from '$lib/server/medora/registration/patient-registration.server';
import { createPatientVisitInHospital } from '$lib/server/medora/patient-visit/patient-visit.server';
import {
	getFinancialYearIdToday,
	updateMedicationOrderBatch,
	deleteMedicationOrderBatch,
	type MedicationOrderLineSaveInput
} from './medication-order-internal.server';
import {
	assertBatchNotPaid,
	validateMedicationOrderLinesForDispense,
	insertMedicationOrderLineWithAllocations,
	isVisitOpBillClosed,
	loadAllocationsForLineIds
} from './medication-order-dispense.server';

export {
	listMastersForInternalForm,
	searchStores,
	searchItemNamePrice
} from './medication-order-internal.server';

export { getBatchWithLines } from './medication-order-internal.server';

const NO_EMAIL_SUFFIX = '@no-email.medora';

function patientDisplayName(parts: {
	firstName?: string | null;
	middleName?: string | null;
	lastName?: string | null;
}): string {
	return [parts.firstName, parts.middleName, parts.lastName]
		.map((p) => (p ?? '').trim())
		.filter(Boolean)
		.join(' ')
		.trim();
}

/**
 * Quick-register an external patient (HRN) and open a manual OPD visit.
 * Branch is taken from the selected pharmacy store.
 */
export async function registerExternalPatientAndOpenOpVisit(
	event: RequestEvent,
	input: {
		hospitalId: string;
		storeId: number;
		firstName: string;
		lastName?: string;
		phonePrimary?: string;
		genderId?: number | null;
		advisingDoctor?: string;
	}
) {
	const hospitalId = input.hospitalId;
	await ensureCanAccessHospital(event, hospitalId);

	const firstName = input.firstName.trim();
	const lastName = (input.lastName ?? '').trim();
	const phonePrimary = (input.phonePrimary ?? '').trim();
	if (!firstName) throw error(400, 'Patient first name is required');

	const db = ensureDb();
	const branches = await db
		.select({ id: table.hospitalBranchTable.id })
		.from(table.hospitalBranchTable)
		.where(eq(table.hospitalBranchTable.hospitalId, hospitalId));
	const branchIds = branches.map((b) => b.id);
	if (branchIds.length === 0) {
		throw error(400, 'No branch configured for this hospital');
	}

	const [st] = await db
		.select({
			id: table.storeTable.id,
			branchId: table.storeTable.branchId
		})
		.from(table.storeTable)
		.where(
			and(
				eq(table.storeTable.id, input.storeId),
				inArray(table.storeTable.branchId, branchIds),
				eq(table.storeTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	if (!st) throw error(400, 'Invalid store');

	const displayName =
		patientDisplayName({ firstName, lastName }) || firstName;

	const created = await createPatientWithUserInHospital(event, {
		hospitalId,
		branchId: st.branchId,
		email: `${uuidV7()}${NO_EMAIL_SUFFIX}`,
		name: displayName,
		firstName,
		lastName: lastName || undefined,
		phonePrimary: phonePrimary || undefined,
		genderId:
			input.genderId != null && Number.isFinite(input.genderId)
				? Number(input.genderId)
				: undefined,
		isExternal: true,
		remark: 'Created from External Sales (pharmacy walk-in)'
	});

	const visit = await createPatientVisitInHospital(event, {
		hospitalId,
		patientId: created.patient.id,
		branchId: st.branchId,
		visitTypeId: VisitTypeEnum.OPD,
		statusId: StatusEnum.ACTIVE
	});

	return {
		patient: {
			id: created.patient.id,
			code: created.patient.code,
			firstName: created.patient.firstName,
			lastName: created.patient.lastName,
			isExternal: true as const
		},
		visit: {
			id: visit.id,
			visitNo: visit.visitNo,
			visitTypeId: visit.visitTypeId
		},
		displayName,
		advisingDoctor: (input.advisingDoctor ?? '').trim() || null
	};
}

export async function listExternalBatches(
	event: RequestEvent,
	hospitalId: string
) {
	await ensureCanAccessHospital(event, hospitalId);
	const db = ensureDb();
	const b = table.medicationOrderBatchTable;
	const uCreat = alias(table.userTable, 'mob_ext_created_by');
	const uUpd = alias(table.userTable, 'mob_ext_updated_by');
	const pv = table.patientVisitTable;
	const pay = table.medicationOrderBatchPaymentTable;
	const lineCounts = db
		.select({
			batchId: table.medicationOrderLineTable.batchId,
			lineCount: count().as('lineCount')
		})
		.from(table.medicationOrderLineTable)
		.where(isNull(table.medicationOrderLineTable.deletedAt))
		.groupBy(table.medicationOrderLineTable.batchId)
		.as('mob_ext_line_counts');

	const closedOp = db
		.select({
			visitId: table.opBillingTable.visitId,
			closed: sql<boolean>`true`.as('closed')
		})
		.from(table.opBillingTable)
		.where(
			and(
				eq(
					table.opBillingTable.statusTaggingId,
					BillingStatusTaggingEnum.CLOSED
				),
				sql`${table.opBillingTable.statusId} <> ${StatusEnum.DELETED}`
			)
		)
		.as('mob_ext_closed_op');

	const rows = await db
		.select({
			id: b.id,
			hospitalId: b.hospitalId,
			visitId: b.visitId,
			visitNo: pv.visitNo,
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
				),
			legacyPaid: sql<boolean>`(${pay.id} is not null)`.mapWith(
				Boolean
			),
			opBillClosed: sql<boolean>`(${closedOp.closed} is true)`.mapWith(
				Boolean
			),
			receiptNo: pay.receiptNo
		})
		.from(b)
		.leftJoin(pv, eq(b.visitId, pv.id))
		.leftJoin(uCreat, eq(b.createdBy, uCreat.id))
		.leftJoin(uUpd, eq(b.updatedBy, uUpd.id))
		.leftJoin(lineCounts, eq(b.id, lineCounts.batchId))
		.leftJoin(
			pay,
			and(eq(pay.batchId, b.id), isNull(pay.deletedAt))
		)
		.leftJoin(closedOp, eq(closedOp.visitId, b.visitId))
		.where(
			and(
				eq(b.hospitalId, hospitalId),
				isNotNull(b.extCustomerName),
				isNull(b.deletedAt)
			)
		)
		.orderBy(desc(b.id))
		.limit(200);

	return rows.map((r) => ({
		id: r.id,
		hospitalId: r.hospitalId,
		visitId: r.visitId,
		visitNo: r.visitNo,
		storeId: r.storeId,
		extCustomerName: r.extCustomerName,
		advisingDoctor: r.advisingDoctor,
		batchNo: r.batchNo,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		createdBy: r.createdBy,
		updatedBy: r.updatedBy,
		createdByName: r.createdByName,
		updatedByName: r.updatedByName,
		lineCount: r.lineCount,
		isPaid: r.legacyPaid || r.opBillClosed,
		receiptNo: r.receiptNo
	}));
}

/**
 * Reorder from an external-origin history batch onto the same visit when present.
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
				isNotNull(mob.extCustomerName),
				isNull(mob.deletedAt)
			)
		)
		.limit(1);
	if (!srcBatch) throw error(404, 'Source batch not found');
	if (!srcBatch.visitId) {
		throw error(
			400,
			'Legacy walk-in batch has no visit. Register a new OP visit and create a fresh order.'
		);
	}

	const extCustomerName = (srcBatch.extCustomerName ?? '').trim();
	const advisingDoctor = (srcBatch.advisingDoctor ?? '').trim();
	if (!extCustomerName) {
		throw error(400, 'Source batch has no customer name');
	}

	const [firstLine] = await db
		.select()
		.from(mol)
		.where(and(eq(mol.batchId, sourceBatchId), isNull(mol.deletedAt)))
		.orderBy(mol.lineNo)
		.limit(1);
	if (!firstLine) throw error(400, 'Source batch has no lines');

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
				eq(mob.hospitalId, hospitalId),
				eq(mob.visitId, srcBatch.visitId),
				isNull(mob.deletedAt),
				isNull(mol.deletedAt)
			)
		);

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
	const allocs = await loadAllocationsForLineIds([firstLine.id]);
	const newLine: MedicationOrderLineSaveInput = {
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
		substituteNotAllowed: firstLine.substituteNotAllowed,
		unitSalePrice: String(firstLine.unitSalePrice ?? '0'),
		qtyOut: String(firstLine.qtyOut ?? '1'),
		outUnitId: Number(firstLine.outUnitId ?? 0),
		itemUnitMasterId: Number(firstLine.itemUnitMasterId ?? 0),
		allocations: allocs.map((a) => ({
			batchId: a.batchId,
			qtyPurchase: String(a.qtyPurchase)
		}))
	};
	if (
		!newLine.itemUnitMasterId ||
		newLine.allocations.length === 0
	) {
		throw error(
			400,
			'Source line has no stock allocations; cannot reorder'
		);
	}

	return await saveMedicationOrderBatchExternal(event, {
		hospitalId,
		visitId: srcBatch.visitId,
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
		visitId: string;
		storeId: number;
		extCustomerName: string;
		advisingDoctor: string;
		lines: MedicationOrderLineSaveInput[];
	}
) {
	const { hospitalId, visitId, storeId, lines } = input;
	const extCustomerName = input.extCustomerName.trim();
	const advisingDoctor = input.advisingDoctor.trim();
	await ensureCanAccessHospital(event, hospitalId);
	if (!visitId) throw error(400, 'visitId is required');
	if (extCustomerName.length === 0) {
		throw error(400, 'Customer name is required');
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
	if (v.visitTypeId !== VisitTypeEnum.OPD) {
		throw error(400, 'External sales require an OPD visit');
	}
	if (await isVisitOpBillClosed(hospitalId, visitId)) {
		throw error(
			400,
			'OP bill for this visit is closed; cannot add medication orders'
		);
	}

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

	await validateMedicationOrderLinesForDispense({
		hospitalId,
		storeId,
		lines
	});

	for (const ln of lines) {
		if (isMedOrderStartBeforeToday(ln.startAt, now)) {
			throw error(400, 'Start date cannot be before today');
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
				extCustomerName,
				advisingDoctor:
					advisingDoctor.length > 0 ? advisingDoctor : null,
				batchRemarks: null,
				createdBy: userId,
				updatedBy: userId
			})
			.returning();
		if (!batch) throw error(500, 'Failed to create batch');
		let lineNo = 1;
		for (const ln of lines) {
			if (isMedOrderStartBeforeToday(ln.startAt, now)) {
				throw error(400, 'Start date cannot be before today');
			}
			await insertMedicationOrderLineWithAllocations(tx, {
				hospitalId,
				storeId,
				batchId: batch.id,
				lineNo: lineNo++,
				line: ln,
				userId,
				pricingModule: EXTERNAL_SALES_PRICING_MODULE
			});
		}
		return { batch, batchNo };
	});
}

function assertExternalOriginBatch(b: {
	extCustomerName: string | null;
	visitId: string | null;
}) {
	if (!(b.extCustomerName ?? '').trim()) {
		throw error(400, 'This batch is not an external sale order');
	}
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
	assertExternalOriginBatch(b);
	await assertBatchNotPaid(input.hospitalId, input.batchId);
	return updateMedicationOrderBatch(event, {
		...input,
		pricingModule: EXTERNAL_SALES_PRICING_MODULE
	});
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
	assertExternalOriginBatch(b);
	await assertBatchNotPaid(hospitalId, batchId);
	return deleteMedicationOrderBatch(event, hospitalId, batchId);
}
