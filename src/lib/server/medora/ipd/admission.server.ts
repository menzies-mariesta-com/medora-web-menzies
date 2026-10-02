import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { IpdAdmissionSchema } from '$lib/server/db/schema-type';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import type {
	AdmitToIpdPayload,
	AdtSourceOpdVisitRow,
	DischargePayload,
	IpdCensusRow,
	OtHoldPayload,
	TransferBedPayload
} from '$lib/model/type/medora/ipd/ipd.type';
import {
	BillingStatusTaggingEnum,
	IpdAdmissionOrderStatusTaggingEnum,
	IpdAdmissionStatusEnum,
	IpdBedStatusEnum,
	StatusEnum,
	VisitStatusTaggingEnum,
	VisitTypeEnum
} from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { generatePrefix } from '$lib/server/medora/prefix/prefix-generator.server';
import { resolveBedTariffContext } from '$lib/server/medora/ipd/tariff.server';
import {
	and,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	ne,
	or,
	sql
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { assertDischargeSummarySigned } from '$lib/server/medora/clinical/discharge-summary.server';

const sourceOpdVisit = alias(table.patientVisitTable, 'source_opd');

async function nextAdmissionNo(params: {
	hospitalId: string;
	branchId: string;
}): Promise<string> {
	const db = ensureDb();
	const today = new Date().toISOString().slice(0, 10);
	const [financialYear] = await db
		.select({
			id: table.financialYearTable.id
		})
		.from(table.financialYearTable)
		.where(
			and(
				eq(table.financialYearTable.hospitalId, params.hospitalId),
				sql`${table.financialYearTable.startDate} <= ${today}`,
				sql`${table.financialYearTable.endDate} >= ${today}`
			)
		)
		.limit(1);

	if (!financialYear) {
		throw error(
			400,
			'Financial year is not configured for this hospital.'
		);
	}

	return generatePrefix({
		hospitalId: params.hospitalId,
		branchId: params.branchId,
		financialYearId: financialYear.id,
		prefixKey: PREFIX_PURPOSE_STORAGE.IPD_ADMISSION_NO,
		context: {}
	});
}

export async function getActiveAdmissionByVisit(input: {
	visitId: number;
}): Promise<IpdAdmissionSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.ipdAdmissionTable)
		.where(
			and(
				eq(table.ipdAdmissionTable.visitId, input.visitId),
				eq(
					table.ipdAdmissionTable.admissionStatus,
					IpdAdmissionStatusEnum.ADMITTED
				),
				ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	return row ?? null;
}

async function openStaySegment(
	 
	tx: any,
	input: {
		admissionId: number;
		hospitalId: string;
		ctx: Awaited<ReturnType<typeof resolveBedTariffContext>>;
		startedAt?: string;
	}
): Promise<void> {
	await tx.insert(table.ipdBedStaySegmentTable).values({
		admissionId: input.admissionId,
		hospitalId: input.hospitalId,
		wardId: input.ctx.wardId,
		roomId: input.ctx.roomId,
		bedId: input.ctx.bedId,
		wardNameSnapshot: input.ctx.wardName,
		roomNameSnapshot: input.ctx.roomName,
		bedNameSnapshot: input.ctx.bedName,
		bedBasePriceSnapshot: input.ctx.bedBasePrice,
		roomMarkupSnapshot: input.ctx.roomMarkup,
		wardMarkupSnapshot: input.ctx.wardMarkup,
		dailyTariffSnapshot: input.ctx.dailyTariff,
		startedAt: input.startedAt ?? new Date().toISOString()
	});
}

async function closeOpenStaySegment(
	 
	tx: any,
	admissionId: number,
	endedAt: string
): Promise<void> {
	await tx
		.update(table.ipdBedStaySegmentTable)
		.set({ endedAt })
		.where(
			and(
				eq(table.ipdBedStaySegmentTable.admissionId, admissionId),
				isNull(table.ipdBedStaySegmentTable.endedAt)
			)
		);
}

/**
 * Unfinished OPD visits for a patient — candidates for ADT source link.
 */
export async function listEligibleSourceOpdVisits(input: {
	hospitalId: string;
	patientId: string;
}): Promise<AdtSourceOpdVisitRow[]> {
	const db = ensureDb();
	const visits = await db
		.select({
			visitId: table.patientVisitTable.id,
			visitNo: table.patientVisitTable.visitNo
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.hospitalId, input.hospitalId),
				eq(table.patientVisitTable.patientId, input.patientId),
				eq(table.patientVisitTable.visitTypeId, VisitTypeEnum.OPD),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED),
				ne(
					table.patientVisitTable.statusTaggingId,
					VisitStatusTaggingEnum.CLOSED_DISCHARGED
				)
			)
		)
		.orderBy(desc(table.patientVisitTable.id));

	if (visits.length === 0) return [];

	const visitIds = visits.map((v) => v.visitId);
	const openBills = await db
		.select({ visitId: table.opBillingTable.visitId })
		.from(table.opBillingTable)
		.where(
			and(
				inArray(table.opBillingTable.visitId, visitIds),
				eq(
					table.opBillingTable.statusTaggingId,
					BillingStatusTaggingEnum.OPEN
				),
				ne(table.opBillingTable.statusId, StatusEnum.DELETED)
			)
		);
	const openSet = new Set(openBills.map((b) => b.visitId));

	return visits.map((v) => ({
		visitId: v.visitId,
		visitNo: v.visitNo,
		hasOpenOpBill: openSet.has(v.visitId)
	}));
}

export async function admitVisitToIpd(
	event: import('@sveltejs/kit').RequestEvent,
	payload: AdmitToIpdPayload & {
		hospitalId: string;
		actorStaffId?: string | null;
	}
): Promise<IpdAdmissionSchema> {
	const db = ensureDb();
	const patientId = String(payload.patientId ?? '').trim();
	if (!patientId) throw error(400, 'patientId is required');

	const [patient] = await db
		.select({ id: table.patientTable.id })
		.from(table.patientTable)
		.where(
			and(
				eq(table.patientTable.id, patientId),
				ne(table.patientTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!patient) throw error(404, 'Patient not found');

	const ctx = await resolveBedTariffContext({
		hospitalId: payload.hospitalId,
		bedId: payload.bedId
	});
	if (ctx.branchId !== payload.branchId) {
		throw error(400, 'Bed does not belong to this branch');
	}
	if (
		typeof payload.wardId === 'number' &&
		payload.wardId !== ctx.wardId
	) {
		throw error(400, 'Bed does not belong to the selected ward');
	}

	const [bed] = await db
		.select({ bedStatus: table.bedTable.bedStatus })
		.from(table.bedTable)
		.where(eq(table.bedTable.id, payload.bedId))
		.limit(1);
	if (!bed || bed.bedStatus !== IpdBedStatusEnum.FREE) {
		throw error(400, 'Bed is not free');
	}

	const sourceOpdVisitIdRaw = payload.sourceOpdVisitId;
	const sourceOpdVisitId =
		typeof sourceOpdVisitIdRaw === 'number' &&
		Number.isFinite(sourceOpdVisitIdRaw) &&
		sourceOpdVisitIdRaw > 0
			? sourceOpdVisitIdRaw
			: null;

	const orderIdRaw = payload.admissionOrderId;
	const admissionOrderId =
		typeof orderIdRaw === 'number' &&
		Number.isFinite(orderIdRaw) &&
		orderIdRaw > 0
			? orderIdRaw
			: null;

	// Prefer explicit admitting doctor; else order’s ordering doctor; else source OPD visit doctor.
	// Doctor EMR visit list scopes by patient_visit.doctor_id — leaving this null hides the IPD visit.
	let admittingDoctorId =
		typeof payload.admittingDoctorId === 'string' &&
		payload.admittingDoctorId.trim()
			? payload.admittingDoctorId.trim()
			: null;
	if (!admittingDoctorId && admissionOrderId != null) {
		const [orderDoc] = await db
			.select({
				orderingDoctorId: table.ipdAdmissionOrderTable.orderingDoctorId
			})
			.from(table.ipdAdmissionOrderTable)
			.where(
				and(
					eq(table.ipdAdmissionOrderTable.id, admissionOrderId),
					eq(
						table.ipdAdmissionOrderTable.hospitalId,
						payload.hospitalId
					),
					ne(table.ipdAdmissionOrderTable.statusId, StatusEnum.DELETED)
				)
			)
			.limit(1);
		admittingDoctorId = orderDoc?.orderingDoctorId ?? null;
	}
	if (!admittingDoctorId && sourceOpdVisitId != null) {
		const [srcDoc] = await db
			.select({ doctorId: table.patientVisitTable.doctorId })
			.from(table.patientVisitTable)
			.where(
				and(
					eq(table.patientVisitTable.id, sourceOpdVisitId),
					eq(table.patientVisitTable.hospitalId, payload.hospitalId)
				)
			)
			.limit(1);
		admittingDoctorId = srcDoc?.doctorId ?? null;
	}

	// Creates a new IPD visit; soft gate when converting from a linked OPD visit.
	const { createPatientVisitInHospital } = await import(
		'$lib/server/medora/patient-visit/patient-visit.server'
	);
	const visit = await createPatientVisitInHospital(event, {
		hospitalId: payload.hospitalId,
		branchId: payload.branchId,
		patientId,
		visitTypeId: VisitTypeEnum.IPD,
		doctorId: admittingDoctorId,
		...(sourceOpdVisitId != null
			? { convertFromOpdVisitId: sourceOpdVisitId }
			: {})
	});

	const admissionNo = await nextAdmissionNo({
		hospitalId: payload.hospitalId,
		branchId: payload.branchId
	});

	const admittedAt = new Date().toISOString();

	const result = await db.transaction(async (tx) => {
		const [admission] = await tx
			.insert(table.ipdAdmissionTable)
			.values({
				visitId: visit.id,
				hospitalId: payload.hospitalId,
				branchId: payload.branchId,
				admissionNo,
				wardId: ctx.wardId,
				roomId: ctx.roomId,
				bedId: payload.bedId,
				admittingDoctorId,
				reasonNotes: payload.reasonNotes ?? null,
				admittedAt,
				admissionStatus: IpdAdmissionStatusEnum.ADMITTED,
				sourceOpdVisitId
			})
			.returning();
		if (!admission) throw new Error('Admission insert failed');

		await tx
			.update(table.bedTable)
			.set({ bedStatus: IpdBedStatusEnum.OCCUPIED })
			.where(eq(table.bedTable.id, payload.bedId));

		await tx.insert(table.ipdBedHistoryTable).values({
			admissionId: admission.id,
			fromBedId: null,
			toBedId: payload.bedId,
			fromRoomId: null,
			toRoomId: ctx.roomId,
			fromWardId: null,
			toWardId: ctx.wardId,
			movedByStaffId: payload.actorStaffId ?? null,
			remark: 'Initial admission',
			movedAt: admittedAt
		});

		await openStaySegment(tx, {
			admissionId: admission.id,
			hospitalId: payload.hospitalId,
			ctx,
			startedAt: admittedAt
		});

		if (admissionOrderId != null) {
			const [order] = await tx
				.select({
					id: table.ipdAdmissionOrderTable.id,
					statusTaggingId: table.ipdAdmissionOrderTable.statusTaggingId,
					sourceOpdVisitId: table.ipdAdmissionOrderTable.sourceOpdVisitId,
					patientId: table.ipdAdmissionOrderTable.patientId
				})
				.from(table.ipdAdmissionOrderTable)
				.where(
					and(
						eq(table.ipdAdmissionOrderTable.id, admissionOrderId),
						eq(
							table.ipdAdmissionOrderTable.hospitalId,
							payload.hospitalId
						),
						ne(table.ipdAdmissionOrderTable.statusId, StatusEnum.DELETED)
					)
				)
				.limit(1);
			if (!order) throw error(404, 'Admission order not found');
			if (
				order.statusTaggingId !==
				IpdAdmissionOrderStatusTaggingEnum.PENDING
			) {
				throw error(400, 'Admission order is not pending');
			}
			if (order.patientId !== patientId) {
				throw error(400, 'Admission order patient mismatch');
			}
			if (
				sourceOpdVisitId != null &&
				order.sourceOpdVisitId !== sourceOpdVisitId
			) {
				throw error(400, 'Admission order source OPD mismatch');
			}
			await tx
				.update(table.ipdAdmissionOrderTable)
				.set({
					statusTaggingId: IpdAdmissionOrderStatusTaggingEnum.ADMITTED,
					admissionId: admission.id
				})
				.where(eq(table.ipdAdmissionOrderTable.id, admissionOrderId));
		}

		return admission;
	});

	return result;
}

export async function transferBed(
	payload: TransferBedPayload & {
		hospitalId: string;
		actorStaffId?: string | null;
	}
): Promise<IpdAdmissionSchema> {
	const db = ensureDb();
	const [admission] = await db
		.select()
		.from(table.ipdAdmissionTable)
		.where(
			and(
				eq(table.ipdAdmissionTable.id, payload.admissionId),
				eq(table.ipdAdmissionTable.hospitalId, payload.hospitalId),
				eq(
					table.ipdAdmissionTable.admissionStatus,
					IpdAdmissionStatusEnum.ADMITTED
				)
			)
		)
		.limit(1);
	if (!admission) throw error(404, 'Active admission not found');
	if (admission.otHoldLocation) {
		throw error(
			400,
			'Clear OT/Recovery hold before transferring beds'
		);
	}

	const toCtx = await resolveBedTariffContext({
		hospitalId: payload.hospitalId,
		bedId: payload.toBedId
	});
	if (toCtx.branchId !== admission.branchId) {
		throw error(400, 'Target bed is not in the admission branch');
	}
	if (
		typeof payload.toWardId === 'number' &&
		payload.toWardId !== toCtx.wardId
	) {
		throw error(400, 'Target bed does not belong to selected ward');
	}
	if (admission.bedId === payload.toBedId) {
		throw error(400, 'Already on this bed');
	}

	const [toBed] = await db
		.select({ bedStatus: table.bedTable.bedStatus })
		.from(table.bedTable)
		.where(eq(table.bedTable.id, payload.toBedId))
		.limit(1);
	if (!toBed || toBed.bedStatus !== IpdBedStatusEnum.FREE) {
		throw error(400, 'Target bed is not free');
	}

	const movedAt = new Date().toISOString();

	return db.transaction(async (tx) => {
		await closeOpenStaySegment(tx, admission.id, movedAt);

		await tx
			.update(table.bedTable)
			.set({ bedStatus: IpdBedStatusEnum.CLEANING })
			.where(eq(table.bedTable.id, admission.bedId));
		await tx
			.update(table.bedTable)
			.set({ bedStatus: IpdBedStatusEnum.OCCUPIED })
			.where(eq(table.bedTable.id, payload.toBedId));

		await tx.insert(table.ipdBedHistoryTable).values({
			admissionId: admission.id,
			fromBedId: admission.bedId,
			toBedId: payload.toBedId,
			fromRoomId: admission.roomId,
			toRoomId: toCtx.roomId,
			fromWardId: admission.wardId,
			toWardId: toCtx.wardId,
			movedByStaffId:
				payload.movedByStaffId ?? payload.actorStaffId ?? null,
			remark: payload.remark ?? null,
			movedAt
		});

		await openStaySegment(tx, {
			admissionId: admission.id,
			hospitalId: payload.hospitalId,
			ctx: toCtx,
			startedAt: movedAt
		});

		const [updated] = await tx
			.update(table.ipdAdmissionTable)
			.set({
				wardId: toCtx.wardId,
				roomId: toCtx.roomId,
				bedId: payload.toBedId
			})
			.where(eq(table.ipdAdmissionTable.id, admission.id))
			.returning();
		if (!updated) throw new Error('Transfer update failed');
		return updated;
	});
}

export async function setOtHold(
	payload: OtHoldPayload & { hospitalId: string }
): Promise<IpdAdmissionSchema> {
	const db = ensureDb();
	const [admission] = await db
		.select()
		.from(table.ipdAdmissionTable)
		.where(
			and(
				eq(table.ipdAdmissionTable.id, payload.admissionId),
				eq(table.ipdAdmissionTable.hospitalId, payload.hospitalId),
				eq(
					table.ipdAdmissionTable.admissionStatus,
					IpdAdmissionStatusEnum.ADMITTED
				)
			)
		)
		.limit(1);
	if (!admission) throw error(404, 'Active admission not found');

	const location = payload.otHoldLocation?.trim() || null;
	const [updated] = await db
		.update(table.ipdAdmissionTable)
		.set({
			otHoldLocation: location,
			otHoldAt: location ? new Date().toISOString() : null
		})
		.where(eq(table.ipdAdmissionTable.id, admission.id))
		.returning();
	if (!updated) throw new Error('OT hold update failed');
	return updated;
}

export async function dischargeAdmission(
	payload: DischargePayload & { hospitalId: string }
): Promise<IpdAdmissionSchema> {
	const db = ensureDb();
	const [admission] = await db
		.select()
		.from(table.ipdAdmissionTable)
		.where(
			and(
				eq(table.ipdAdmissionTable.id, payload.admissionId),
				eq(table.ipdAdmissionTable.hospitalId, payload.hospitalId),
				eq(
					table.ipdAdmissionTable.admissionStatus,
					IpdAdmissionStatusEnum.ADMITTED
				)
			)
		)
		.limit(1);
	if (!admission) throw error(404, 'Active admission not found');

	await assertDischargeSummarySigned({
		hospitalId: payload.hospitalId,
		visitId: admission.visitId
	});

	const dischargedAt = new Date().toISOString();

	return db.transaction(async (tx) => {
		await closeOpenStaySegment(tx, admission.id, dischargedAt);

		await tx
			.update(table.bedTable)
			.set({ bedStatus: IpdBedStatusEnum.CLEANING })
			.where(eq(table.bedTable.id, admission.bedId));

		const [updated] = await tx
			.update(table.ipdAdmissionTable)
			.set({
				admissionStatus: IpdAdmissionStatusEnum.DISCHARGED,
				dischargedAt,
				otHoldLocation: null,
				otHoldAt: null
			})
			.where(eq(table.ipdAdmissionTable.id, admission.id))
			.returning();
		if (!updated) throw new Error('Discharge update failed');

		await tx
			.update(table.patientVisitTable)
			.set({
				statusTaggingId: VisitStatusTaggingEnum.CLOSED_DISCHARGED
			})
			.where(eq(table.patientVisitTable.id, admission.visitId));

		return updated;
	});
}

/** After IP bill print + pharmacy: ensure visit is Closed / Discharged (idempotent). */
export async function closeIpdVisit(input: {
	visitId: number;
	hospitalId: string;
}): Promise<void> {
	const db = ensureDb();
	const [visit] = await db
		.select()
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');
	if (
		visit.statusTaggingId === VisitStatusTaggingEnum.CLOSED_DISCHARGED
	) {
		return;
	}
	await db
		.update(table.patientVisitTable)
		.set({
			statusTaggingId: VisitStatusTaggingEnum.CLOSED_DISCHARGED
		})
		.where(eq(table.patientVisitTable.id, input.visitId));
}

export async function getIpdCensusPaginated(
	params: PaginationParams & {
		hospitalId: string;
		branchId?: string;
		wardId?: number;
		search?: string;
	}
): Promise<PaginatedResult<IpdCensusRow>> {
	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const conditions = [
		eq(table.ipdAdmissionTable.hospitalId, params.hospitalId),
		eq(
			table.ipdAdmissionTable.admissionStatus,
			IpdAdmissionStatusEnum.ADMITTED
		),
		ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED)
	];
	if (params.branchId) {
		conditions.push(
			eq(table.ipdAdmissionTable.branchId, params.branchId)
		);
	}
	if (typeof params.wardId === 'number') {
		conditions.push(
			eq(table.ipdAdmissionTable.wardId, params.wardId)
		);
	}
	const search = params.search?.trim();
	if (search) {
		conditions.push(
			or(
				ilike(table.patientTable.code, `%${search}%`),
				ilike(table.patientTable.firstName, `%${search}%`),
				ilike(table.patientTable.lastName, `%${search}%`),
				ilike(table.patientVisitTable.visitNo, `%${search}%`),
				ilike(table.ipdAdmissionTable.admissionNo, `%${search}%`)
			)!
		);
	}
	const whereClause = and(...conditions);

	const baseFrom = ensureDb()
		.select({
			admissionId: table.ipdAdmissionTable.id,
			admissionNo: table.ipdAdmissionTable.admissionNo,
			visitId: table.ipdAdmissionTable.visitId,
			visitNo: table.patientVisitTable.visitNo,
			sourceOpdVisitId: table.ipdAdmissionTable.sourceOpdVisitId,
			sourceOpdVisitNo: sourceOpdVisit.visitNo,
			patientId: table.patientTable.id,
			patientCode: table.patientTable.code,
			patientFirst: table.patientTable.firstName,
			patientMiddle: table.patientTable.middleName,
			patientLast: table.patientTable.lastName,
			branchId: table.ipdAdmissionTable.branchId,
			wardId: table.ipdAdmissionTable.wardId,
			wardName: table.wardTable.name,
			roomId: table.ipdAdmissionTable.roomId,
			roomName: table.roomTable.name,
			bedId: table.ipdAdmissionTable.bedId,
			bedName: table.bedTable.name,
			admittedAt: table.ipdAdmissionTable.admittedAt,
			doctorFirst: table.staffTable.firstName,
			doctorMiddle: table.staffTable.middleName,
			doctorLast: table.staffTable.lastName,
			admissionStatus: table.ipdAdmissionTable.admissionStatus,
			otHoldLocation: table.ipdAdmissionTable.otHoldLocation,
			dailyTariff: sql<string>`(
				coalesce(${table.bedTable.basePrice}, 0)
				* (1 + coalesce(${table.roomCategoryTable.roomMarkup}, 0) / 100.0)
				* (1 + coalesce(${table.wardCategoryTable.wardMarkup}, 0) / 100.0)
			)::text`
		})
		.from(table.ipdAdmissionTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.ipdAdmissionTable.visitId, table.patientVisitTable.id)
		)
		.leftJoin(
			sourceOpdVisit,
			eq(
				table.ipdAdmissionTable.sourceOpdVisitId,
				sourceOpdVisit.id
			)
		)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.leftJoin(
			table.wardTable,
			eq(table.ipdAdmissionTable.wardId, table.wardTable.id)
		)
		.leftJoin(
			table.wardCategoryTable,
			eq(
				table.wardTable.wardCategoryId,
				table.wardCategoryTable.id
			)
		)
		.leftJoin(
			table.roomTable,
			eq(table.ipdAdmissionTable.roomId, table.roomTable.id)
		)
		.leftJoin(
			table.roomCategoryTable,
			eq(
				table.roomTable.roomCategoryId,
				table.roomCategoryTable.id
			)
		)
		.leftJoin(
			table.bedTable,
			eq(table.ipdAdmissionTable.bedId, table.bedTable.id)
		)
		.leftJoin(
			table.staffTable,
			eq(
				table.ipdAdmissionTable.admittingDoctorId,
				table.staffTable.id
			)
		)
		.where(whereClause);

	const [rows, countResult] = await Promise.all([
		baseFrom
			.orderBy(desc(table.ipdAdmissionTable.admittedAt))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.ipdAdmissionTable)
			.innerJoin(
				table.patientVisitTable,
				eq(
					table.ipdAdmissionTable.visitId,
					table.patientVisitTable.id
				)
			)
			.innerJoin(
				table.patientTable,
				eq(table.patientVisitTable.patientId, table.patientTable.id)
			)
			.where(whereClause)
	]);

	const data: IpdCensusRow[] = rows.map((r) => ({
		admissionId: r.admissionId,
		admissionNo: r.admissionNo,
		visitId: r.visitId,
		visitNo: r.visitNo,
		sourceOpdVisitId: r.sourceOpdVisitId,
		sourceOpdVisitNo: r.sourceOpdVisitNo,
		patientId: r.patientId,
		patientCode: r.patientCode,
		patientName: [r.patientFirst, r.patientMiddle, r.patientLast]
			.filter(Boolean)
			.join(' '),
		branchId: r.branchId,
		wardId: r.wardId,
		wardName: r.wardName,
		roomId: r.roomId,
		roomName: r.roomName,
		bedId: r.bedId,
		bedName: r.bedName,
		admittedAt: r.admittedAt,
		admittingDoctorName: [r.doctorFirst, r.doctorMiddle, r.doctorLast]
			.filter(Boolean)
			.join(' '),
		admissionStatus: r.admissionStatus,
		otHoldLocation: r.otHoldLocation,
		dailyTariff: r.dailyTariff
	}));

	const total = countResult[0]?.count ?? 0;
	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}
