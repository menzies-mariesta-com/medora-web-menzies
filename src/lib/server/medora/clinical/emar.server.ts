import { error } from '@sveltejs/kit';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { MedicationAdministrationStatusEnum } from '$lib/model/enum/clinical-platform.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

const DEFAULT_DOSES_PER_DAY = 1;

export async function generateSchedulesForLine(input: {
	hospitalId: string;
	visitId: string;
	lineId: number;
	startAt: string;
	durationDays: number;
	dosesPerDay?: number;
}) {
	const doses = input.dosesPerDay ?? DEFAULT_DOSES_PER_DAY;
	const start = new Date(input.startAt);
	const rows: {
		hospitalId: string;
		visitId: string;
		lineId: number;
		scheduledAt: string;
		doseLabel: string;
	}[] = [];
	const hoursBetween = 24 / doses;
	for (let day = 0; day < input.durationDays; day++) {
		for (let dose = 0; dose < doses; dose++) {
			const at = new Date(start);
			at.setDate(at.getDate() + day);
			at.setHours(start.getHours() + dose * hoursBetween);
			rows.push({
				hospitalId: input.hospitalId,
				visitId: input.visitId,
				lineId: input.lineId,
				scheduledAt: at.toISOString(),
				doseLabel: `Day ${day + 1} dose ${dose + 1}`
			});
		}
	}
	if (!rows.length) return;
	await ensureDb().insert(table.medicationOrderScheduleTable).values(rows);
}

export async function listEmarSchedules(input: {
	hospitalId: string;
	visitId?: string;
	from: string;
	to: string;
}) {
	const conditions = [
		eq(table.medicationOrderScheduleTable.hospitalId, input.hospitalId),
		eq(table.medicationOrderScheduleTable.statusId, StatusEnum.ACTIVE),
		gte(table.medicationOrderScheduleTable.scheduledAt, input.from),
		lte(table.medicationOrderScheduleTable.scheduledAt, input.to)
	];
	if (input.visitId) {
		conditions.push(
			eq(table.medicationOrderScheduleTable.visitId, input.visitId)
		);
	}
	return ensureDb()
		.select({
			id: table.medicationOrderScheduleTable.id,
			visitId: table.medicationOrderScheduleTable.visitId,
			lineId: table.medicationOrderScheduleTable.lineId,
			scheduledAt: table.medicationOrderScheduleTable.scheduledAt,
			doseLabel: table.medicationOrderScheduleTable.doseLabel,
			itemName: table.itemMasterTable.itemName
		})
		.from(table.medicationOrderScheduleTable)
		.innerJoin(
			table.medicationOrderLineTable,
			eq(
				table.medicationOrderScheduleTable.lineId,
				table.medicationOrderLineTable.id
			)
		)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.medicationOrderLineTable.itemMasterId,
				table.itemMasterTable.id
			)
		)
		.where(and(...conditions))
		.orderBy(table.medicationOrderScheduleTable.scheduledAt);
}

export async function resolveProductBarcode(input: {
	hospitalId: string;
	barcode: string;
}) {
	const [row] = await ensureDb()
		.select({
			itemMasterId: table.pharmacyProductIdentifierTable.itemMasterId,
			itemName: table.itemMasterTable.itemName
		})
		.from(table.pharmacyProductIdentifierTable)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.pharmacyProductIdentifierTable.itemMasterId,
				table.itemMasterTable.id
			)
		)
		.where(
			and(
				eq(
					table.pharmacyProductIdentifierTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.pharmacyProductIdentifierTable.barcodeValue,
					input.barcode.trim()
				),
				eq(
					table.pharmacyProductIdentifierTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function verifyPatientScan(input: {
	hospitalId: string;
	visitId: string;
	scannedToken: string;
}) {
	const token = input.scannedToken.trim();
	const [visit] = await ensureDb()
		.select({
			id: table.patientVisitTable.id,
			visitNo: table.patientVisitTable.visitNo,
			patientCode: table.patientTable.code
		})
		.from(table.patientVisitTable)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');
	const ok =
		token === visit.id ||
		token === String(visit.visitNo ?? '') ||
		token === String(visit.patientCode ?? '');
	if (!ok) throw error(409, 'Patient wristband does not match this visit');
}

export async function verifyNurseScan(input: {
	hospitalId: string;
	scannedCode: string;
}) {
	const [staff] = await ensureDb()
		.select({ id: table.staffTable.id })
		.from(table.staffTable)
		.innerJoin(
			table.staffHospitalTable,
			eq(table.staffTable.id, table.staffHospitalTable.staffId)
		)
		.where(
			and(
				eq(table.staffHospitalTable.hospitalId, input.hospitalId),
				eq(table.staffTable.code, input.scannedCode.trim())
			)
		)
		.limit(1);
	if (!staff) throw error(409, 'Nurse badge not recognized');
	return staff.id;
}

export async function recordAdministration(input: {
	hospitalId: string;
	visitId: string;
	scheduleId: number | null;
	lineId: number;
	status: string;
	scannedPatientToken: string;
	scannedProductBarcode: string;
	scannedNurseCode: string;
	nurseStaffId: string;
	lateReason?: string;
	remark?: string;
}) {
	await verifyPatientScan({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		scannedToken: input.scannedPatientToken
	});
	const product = await resolveProductBarcode({
		hospitalId: input.hospitalId,
		barcode: input.scannedProductBarcode
	});
	if (!product) throw error(409, 'Product barcode not recognized');
	const [line] = await ensureDb()
		.select({
			itemMasterId: table.medicationOrderLineTable.itemMasterId
		})
		.from(table.medicationOrderLineTable)
		.innerJoin(
			table.medicationOrderBatchTable,
			eq(
				table.medicationOrderLineTable.batchId,
				table.medicationOrderBatchTable.id
			)
		)
		.where(
			and(
				eq(table.medicationOrderLineTable.id, input.lineId),
				eq(table.medicationOrderBatchTable.hospitalId, input.hospitalId),
				eq(table.medicationOrderBatchTable.visitId, input.visitId)
			)
		)
		.limit(1);
	if (!line || line.itemMasterId !== product.itemMasterId) {
		throw error(
			409,
			'Scanned product does not match the ordered medication'
		);
	}
	if (
		input.status === MedicationAdministrationStatusEnum.GIVEN &&
		(!input.scannedPatientToken ||
			!input.scannedProductBarcode ||
			!input.scannedNurseCode)
	) {
		throw error(400, 'BCMA requires patient, product, and nurse scans');
	}
	const [row] = await ensureDb()
		.insert(table.medicationAdministrationTable)
		.values({
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			scheduleId: input.scheduleId,
			lineId: input.lineId,
			administrationStatus: input.status,
			administeredAt: new Date().toISOString(),
			scannedPatientToken: input.scannedPatientToken,
			scannedProductBarcode: input.scannedProductBarcode,
			scannedNurseCode: input.scannedNurseCode,
			nurseStaffId: input.nurseStaffId,
			lateReason: input.lateReason ?? null,
			remark: input.remark ?? null
		})
		.returning();
	return row;
}

export async function saveInfusionForLine(input: {
	lineId: number;
	infusionType: string;
	totalVolumeMl?: string | null;
	rateMlHr?: string | null;
	diluentItemMasterId?: number | null;
	concentration?: string | null;
	pumpId?: string | null;
}) {
	await ensureDb()
		.insert(table.medicationOrderInfusionTable)
		.values({
			lineId: input.lineId,
			infusionType: input.infusionType,
			totalVolumeMl: input.totalVolumeMl ?? null,
			rateMlHr: input.rateMlHr ?? null,
			diluentItemMasterId: input.diluentItemMasterId ?? null,
			concentration: input.concentration ?? null,
			pumpId: input.pumpId ?? null
		})
		.onConflictDoUpdate({
			target: table.medicationOrderInfusionTable.lineId,
			set: {
				infusionType: input.infusionType,
				totalVolumeMl: input.totalVolumeMl ?? null,
				rateMlHr: input.rateMlHr ?? null,
				diluentItemMasterId: input.diluentItemMasterId ?? null,
				concentration: input.concentration ?? null,
				pumpId: input.pumpId ?? null,
				updatedAt: sql`now()`
			}
		});
}
