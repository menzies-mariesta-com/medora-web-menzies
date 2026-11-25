import { error } from '@sveltejs/kit';
import { and, eq, gte, isNull, lte, ne, sql } from 'drizzle-orm';
import {
	IpdAdmissionStatusEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import {
	MedicationAdministrationStatusEnum,
	MedicationHoldReasonEnum,
	MedicationInfusionTypeEnum
} from '$lib/model/enum/clinical-platform.enum';
import type {
	EmarBedLocation,
	EmarMarPayload,
	MedicationLineRow
} from '$lib/model/type/medora/clinical-platform.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { visitPatientIdentity } from '$lib/server/medora/visit/visit-context.server';
import { planDosesForWindow } from '$lib/tool/nursing/emar-dose-plan.util';
import {
	canAdministerPrn,
	isPrnOrder,
	prnMinIntervalHours
} from '$lib/tool/nursing/emar-mar.util';
import { parseUtcInstant } from '$lib/util/utc-instant.util';

type VisitMedicationLine = MedicationLineRow & {
	startAt: string;
	durationValue: string;
	durationUnitId: number;
};

/** Lookback for charted doses: comfortably longer than any PRN interval. */
const HISTORY_LOOKBACK_MS = 48 * 3_600_000;

function doseText(dose: string, unitName: string | null): string {
	const value = dose.trim();
	return unitName?.trim() ? `${value} ${unitName.trim()}` : value;
}

function isEmptyText(value: string | null | undefined): boolean {
	return value == null || value.trim() === '';
}

/** Active order lines for a visit, with every label the MAR needs to render. */
async function listVisitMedicationLines(input: {
	hospitalId: string;
	visitId: string;
}): Promise<VisitMedicationLine[]> {
	const line = table.medicationOrderLineTable;
	const rows = await ensureDb()
		.select({
			lineId: line.id,
			lineNo: line.lineNo,
			itemName: table.itemMasterTable.itemName,
			dose: line.dose,
			doseUnitName: table.medOrderDoseUnitTable.name,
			routeName: table.medOrderRouteTable.name,
			instructions: line.lineRemarks,
			orderTypeName: table.medOrderOrderTypeTable.name,
			frequencyAbbreviation:
				table.medOrderFrequencyTable.abbreviation,
			frequencyPerDay: table.medOrderFrequencyTable.frequencyPerDay,
			startAt: line.startAt,
			durationValue: line.durationValue,
			durationUnitId: line.durationUnitId,
			infusionType: table.medicationOrderInfusionTable.infusionType,
			rateMlHr: table.medicationOrderInfusionTable.rateMlHr
		})
		.from(line)
		.innerJoin(
			table.medicationOrderBatchTable,
			eq(table.medicationOrderBatchTable.id, line.batchId)
		)
		.innerJoin(
			table.itemMasterTable,
			eq(table.itemMasterTable.id, line.itemMasterId)
		)
		.innerJoin(
			table.medOrderFrequencyTable,
			eq(table.medOrderFrequencyTable.id, line.frequencyId)
		)
		.innerJoin(
			table.medOrderDoseUnitTable,
			eq(table.medOrderDoseUnitTable.id, line.doseUnitId)
		)
		.leftJoin(
			table.medOrderRouteTable,
			eq(table.medOrderRouteTable.id, line.routeId)
		)
		.leftJoin(
			table.medOrderOrderTypeTable,
			eq(table.medOrderOrderTypeTable.id, line.orderTypeId)
		)
		.leftJoin(
			table.medicationOrderInfusionTable,
			eq(table.medicationOrderInfusionTable.lineId, line.id)
		)
		.where(
			and(
				eq(
					table.medicationOrderBatchTable.hospitalId,
					input.hospitalId
				),
				eq(table.medicationOrderBatchTable.visitId, input.visitId),
				isNull(table.medicationOrderBatchTable.deletedAt),
				isNull(line.deletedAt)
			)
		)
		.orderBy(line.lineNo);

	return rows.map((row) => ({
		lineId: row.lineId,
		lineNo: row.lineNo,
		itemName: row.itemName,
		doseText: doseText(row.dose, row.doseUnitName),
		routeName: isEmptyText(row.routeName) ? null : row.routeName,
		instructions: isEmptyText(row.instructions)
			? null
			: row.instructions,
		orderTypeName: isEmptyText(row.orderTypeName)
			? null
			: row.orderTypeName,
		frequencyAbbreviation: row.frequencyAbbreviation,
		frequencyPerDay: row.frequencyPerDay,
		infusionType: row.infusionType,
		rateMlHr: row.rateMlHr,
		startAt: row.startAt,
		durationValue: row.durationValue,
		durationUnitId: row.durationUnitId
	}));
}

/** Current ward/room/bed: the open bed segment wins over the admission row. */
async function getCurrentBedLocation(input: {
	hospitalId: string;
	visitId: string;
}): Promise<EmarBedLocation | null> {
	const admission = table.ipdAdmissionTable;
	const segment = table.ipdBedStaySegmentTable;
	const ward = table.wardTable;
	const room = table.roomTable;
	const bed = table.bedTable;

	const [row] = await ensureDb()
		.select({
			wardName: sql<
				string | null
			>`coalesce(${segment.wardNameSnapshot}, ${ward.name})`,
			roomName: sql<
				string | null
			>`coalesce(${segment.roomNameSnapshot}, ${room.name})`,
			bedName: sql<
				string | null
			>`coalesce(${segment.bedNameSnapshot}, ${bed.name})`
		})
		.from(admission)
		.leftJoin(
			segment,
			and(
				eq(segment.admissionId, admission.id),
				isNull(segment.endedAt)
			)
		)
		.leftJoin(
			ward,
			eq(
				ward.id,
				sql`coalesce(${segment.wardId}, ${admission.wardId})`
			)
		)
		.leftJoin(
			room,
			eq(
				room.id,
				sql`coalesce(${segment.roomId}, ${admission.roomId})`
			)
		)
		.leftJoin(
			bed,
			eq(bed.id, sql`coalesce(${segment.bedId}, ${admission.bedId})`)
		)
		.where(
			and(
				eq(admission.visitId, input.visitId),
				eq(admission.hospitalId, input.hospitalId),
				eq(
					admission.admissionStatus,
					IpdAdmissionStatusEnum.ADMITTED
				),
				ne(admission.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);

	if (!row) return null;
	return {
		wardName: isEmptyText(row.wardName) ? null : row.wardName,
		roomName: isEmptyText(row.roomName) ? null : row.roomName,
		bedName: isEmptyText(row.bedName) ? null : row.bedName
	};
}

/**
 * Materialise the due doses the active order lines owe inside `[from, to]`.
 * Idempotent: the unique (line, instant) index makes a repeat read a no-op.
 */
export async function ensureSchedulesForVisit(input: {
	hospitalId: string;
	visitId: string;
	from: string;
	to: string;
}): Promise<void> {
	const [lines, durUnits] = await Promise.all([
		listVisitMedicationLines(input),
		ensureDb()
			.select({
				id: table.medOrderDurationUnitTable.id,
				code: table.medOrderDurationUnitTable.code
			})
			.from(table.medOrderDurationUnitTable)
	]);
	if (!lines.length) return;

	const doses = planDosesForWindow({
		lines,
		durUnits,
		from: input.from,
		to: input.to
	});
	if (!doses.length) return;

	await ensureDb()
		.insert(table.medicationOrderScheduleTable)
		.values(
			doses.map((dose) => ({
				hospitalId: input.hospitalId,
				visitId: input.visitId,
				lineId: dose.lineId,
				scheduledAt: dose.scheduledAt
			}))
		)
		.onConflictDoNothing();
}

/** The whole MAR in one round trip: identity, bed, lines, due doses, charted doses. */
export async function getEmarMar(input: {
	hospitalId: string;
	visitId: string;
	from: string;
	to: string;
}): Promise<EmarMarPayload> {
	const db = ensureDb();
	// Charted doses are read beyond the view window: a PRN interval and an infusion
	// marker can start before it, and the card must still show them.
	const historyFrom = new Date(
		parseUtcInstant(input.from) - HISTORY_LOOKBACK_MS
	).toISOString();
	const [patient, bedLocation, lines, administrations] =
		await Promise.all([
			visitPatientIdentity(input),
			getCurrentBedLocation(input),
			listVisitMedicationLines(input),
			db
				.select({
					id: table.medicationAdministrationTable.id,
					scheduleId: table.medicationAdministrationTable.scheduleId,
					lineId: table.medicationAdministrationTable.lineId,
					administrationStatus:
						table.medicationAdministrationTable.administrationStatus,
					administeredAt:
						table.medicationAdministrationTable.administeredAt,
					nurseInitials: table.staffTable.code,
					displayReason:
						table.medicationAdministrationTable.lateReason
				})
				.from(table.medicationAdministrationTable)
				.leftJoin(
					table.staffTable,
					eq(
						table.staffTable.id,
						table.medicationAdministrationTable.nurseStaffId
					)
				)
				.where(
					and(
						eq(
							table.medicationAdministrationTable.hospitalId,
							input.hospitalId
						),
						eq(
							table.medicationAdministrationTable.visitId,
							input.visitId
						),
						gte(
							table.medicationAdministrationTable.administeredAt,
							historyFrom
						),
						lte(
							table.medicationAdministrationTable.administeredAt,
							input.to
						)
					)
				)
				.orderBy(table.medicationAdministrationTable.administeredAt)
		]);

	const schedules = await db
		.select({
			id: table.medicationOrderScheduleTable.id,
			visitId: table.medicationOrderScheduleTable.visitId,
			lineId: table.medicationOrderScheduleTable.lineId,
			scheduledAt: table.medicationOrderScheduleTable.scheduledAt,
			doseLabel: table.medicationOrderScheduleTable.doseLabel
		})
		.from(table.medicationOrderScheduleTable)
		.where(
			and(
				eq(
					table.medicationOrderScheduleTable.hospitalId,
					input.hospitalId
				),
				eq(table.medicationOrderScheduleTable.visitId, input.visitId),
				gte(
					table.medicationOrderScheduleTable.scheduledAt,
					input.from
				),
				lte(table.medicationOrderScheduleTable.scheduledAt, input.to)
			)
		)
		.orderBy(table.medicationOrderScheduleTable.scheduledAt);

	// The grid reads line metadata off each due row (it renders PRN/infusion separately).
	const lineById = new Map(lines.map((line) => [line.lineId, line]));
	const scheduleRows = schedules.flatMap((row) => {
		const meta = lineById.get(row.lineId);
		return meta ? [{ ...meta, ...row }] : [];
	});

	return {
		patient,
		bedLocation,
		lines,
		schedules: scheduleRows,
		administrations
	};
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
	if (!ok)
		throw error(409, 'Patient wristband does not match this visit');
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

/** A line may be given twice only through the PRN interval, never twice per due dose. */
async function assertDoseNotAlreadyGiven(input: {
	hospitalId: string;
	visitId: string;
	scheduleId: number | null;
	lineId: number;
	status: string;
}): Promise<void> {
	if (input.status !== MedicationAdministrationStatusEnum.GIVEN)
		return;
	const conditions = [
		eq(
			table.medicationAdministrationTable.hospitalId,
			input.hospitalId
		),
		eq(table.medicationAdministrationTable.visitId, input.visitId),
		eq(
			table.medicationAdministrationTable.administrationStatus,
			MedicationAdministrationStatusEnum.GIVEN
		)
	];
	if (input.scheduleId != null) {
		conditions.push(
			eq(
				table.medicationAdministrationTable.scheduleId,
				input.scheduleId
			)
		);
	} else {
		// PRN line with no due dose: the interval below is the only guard.
		return;
	}
	const [existing] = await ensureDb()
		.select({ id: table.medicationAdministrationTable.id })
		.from(table.medicationAdministrationTable)
		.where(and(...conditions))
		.limit(1);
	if (existing)
		throw error(409, 'This dose is already recorded as given');
}

/**
 * PRN hard stop: the same line may not be given twice inside the frequency
 * interval. Scheduled doses are guarded per due instant instead, so a late
 * charting round cannot block them.
 */
async function assertPrnInterval(input: {
	hospitalId: string;
	visitId: string;
	lineId: number;
}): Promise<void> {
	const [line] = await ensureDb()
		.select({
			frequencyAbbreviation:
				table.medOrderFrequencyTable.abbreviation,
			frequencyPerDay: table.medOrderFrequencyTable.frequencyPerDay,
			orderTypeName: table.medOrderOrderTypeTable.name
		})
		.from(table.medicationOrderLineTable)
		.innerJoin(
			table.medOrderFrequencyTable,
			eq(
				table.medOrderFrequencyTable.id,
				table.medicationOrderLineTable.frequencyId
			)
		)
		.leftJoin(
			table.medOrderOrderTypeTable,
			eq(
				table.medOrderOrderTypeTable.id,
				table.medicationOrderLineTable.orderTypeId
			)
		)
		.where(eq(table.medicationOrderLineTable.id, input.lineId))
		.limit(1);
	if (!line) throw error(404, 'Order line not found');
	if (!isPrnOrder(line.frequencyAbbreviation, line.orderTypeName))
		return;

	const [last] = await ensureDb()
		.select({
			administeredAt:
				table.medicationAdministrationTable.administeredAt
		})
		.from(table.medicationAdministrationTable)
		.where(
			and(
				eq(
					table.medicationAdministrationTable.hospitalId,
					input.hospitalId
				),
				eq(
					table.medicationAdministrationTable.visitId,
					input.visitId
				),
				eq(table.medicationAdministrationTable.lineId, input.lineId),
				eq(
					table.medicationAdministrationTable.administrationStatus,
					MedicationAdministrationStatusEnum.GIVEN
				)
			)
		)
		.orderBy(
			sql`${table.medicationAdministrationTable.administeredAt} desc`
		)
		.limit(1);
	if (!last) return;

	const { allowed, retryAt } = canAdministerPrn({
		lastGivenAt: last.administeredAt,
		minIntervalHours: prnMinIntervalHours(
			line.frequencyPerDay ?? null
		)
	});
	if (!allowed) {
		throw error(
			409,
			`PRN interval not elapsed. Next dose allowed at ${retryAt ?? ''}`
		);
	}
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
	/** Hold / refuse reason code; required for anything that is not `given`. */
	lateReason?: string;
	remark?: string;
}) {
	const isGiven =
		input.status === MedicationAdministrationStatusEnum.GIVEN;
	// An unexplained omission is not a record, so the reason is mandatory.
	if (!isGiven && isEmptyText(input.lateReason)) {
		throw error(400, 'A reason is required when a dose is not given');
	}
	if (
		isGiven &&
		(!input.scannedPatientToken || !input.scannedNurseCode)
	) {
		throw error(400, 'BCMA requires patient and nurse scans');
	}
	// A hold is a decision about a patient the nurse is already in front of, so
	// only a given dose demands the wristband scan.
	if (isGiven) {
		await verifyPatientScan({
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			scannedToken: input.scannedPatientToken
		});
	}

	if (isGiven) {
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
					eq(
						table.medicationOrderBatchTable.hospitalId,
						input.hospitalId
					),
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
		await assertDoseNotAlreadyGiven(input);
		await assertPrnInterval(input);
	} else {
		const reason = input.lateReason as MedicationHoldReasonEnum;
		if (!Object.values(MedicationHoldReasonEnum).includes(reason)) {
			throw error(400, 'Unknown reason code');
		}
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

/** Start / stop of a running infusion: a marker on the line, not a due dose. */
export async function recordInfusionEvent(input: {
	hospitalId: string;
	visitId: string;
	lineId: number;
	kind: 'start' | 'stop';
	nurseStaffId: string;
	remark?: string;
}) {
	const status =
		input.kind === 'start'
			? MedicationAdministrationStatusEnum.INFUSION_START
			: MedicationAdministrationStatusEnum.INFUSION_STOP;
	const [row] = await ensureDb()
		.insert(table.medicationAdministrationTable)
		.values({
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			scheduleId: null,
			lineId: input.lineId,
			administrationStatus: status,
			administeredAt: new Date().toISOString(),
			nurseStaffId: input.nurseStaffId,
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
			infusionType:
				input.infusionType || MedicationInfusionTypeEnum.CONTINUOUS,
			totalVolumeMl: input.totalVolumeMl ?? null,
			rateMlHr: input.rateMlHr ?? null,
			diluentItemMasterId: input.diluentItemMasterId ?? null,
			concentration: input.concentration ?? null,
			pumpId: input.pumpId ?? null
		})
		.onConflictDoUpdate({
			target: table.medicationOrderInfusionTable.lineId,
			set: {
				infusionType:
					input.infusionType || MedicationInfusionTypeEnum.CONTINUOUS,
				totalVolumeMl: input.totalVolumeMl ?? null,
				rateMlHr: input.rateMlHr ?? null,
				diluentItemMasterId: input.diluentItemMasterId ?? null,
				concentration: input.concentration ?? null,
				pumpId: input.pumpId ?? null,
				updatedAt: sql`now()`
			}
		});
}
