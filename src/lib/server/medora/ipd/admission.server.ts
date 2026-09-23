import { error } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { IpdAdmissionSchema } from '$lib/server/db/schema-type';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import {
	IpdAdmissionStatusEnum,
	IpdBedStatusEnum,
	StatusEnum,
	VisitStatusTaggingEnum,
	VisitTypeEnum
} from '$lib/model/enum/db-link';
import type {
	AdmitToIpdPayload,
	DischargePayload,
	IpdCensusRow,
	TransferBedPayload
} from '$lib/model/type/medora/ipd/ipd.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { generatePrefix } from '$lib/server/medora/prefix/prefix-generator.server';
import {
	and,
	count,
	desc,
	eq,
	ilike,
	ne,
	or,
	sql
} from 'drizzle-orm';
import { assertDischargeSummarySigned } from '$lib/server/medora/clinical/discharge-summary.server';

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

export async function admitVisitToIpd(
	payload: AdmitToIpdPayload & {
		hospitalId: string;
		actorStaffId?: string | null;
	}
): Promise<IpdAdmissionSchema> {
	const db = ensureDb();
	const visitId = payload.visitId;

	const [visit] = await db
		.select()
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, visitId),
				eq(table.patientVisitTable.hospitalId, payload.hospitalId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');
	if (visit.statusTaggingId === VisitStatusTaggingEnum.CLOSED) {
		throw error(400, 'Cannot admit a closed visit');
	}
	if (visit.statusTaggingId === VisitStatusTaggingEnum.ADMITTED) {
		throw error(400, 'Visit is already admitted');
	}

	const existing = await getActiveAdmissionByVisit({ visitId });
	if (existing)
		throw error(400, 'Visit already has an active admission');

	const [ward] = await db
		.select({
			id: table.wardTable.id,
			branchId: table.wardTable.branchId
		})
		.from(table.wardTable)
		.where(
			and(
				eq(table.wardTable.id, payload.wardId),
				eq(table.wardTable.hospitalId, payload.hospitalId),
				eq(table.wardTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	if (!ward) throw error(400, 'Ward not found');
	if (ward.branchId !== payload.branchId) {
		throw error(400, 'Ward does not belong to this branch');
	}

	const [bed] = await db
		.select()
		.from(table.bedTable)
		.where(
			and(
				eq(table.bedTable.id, payload.bedId),
				eq(table.bedTable.wardId, payload.wardId),
				eq(table.bedTable.hospitalId, payload.hospitalId),
				eq(table.bedTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	if (!bed) throw error(400, 'Bed not found in ward');
	if (bed.bedStatus !== IpdBedStatusEnum.FREE) {
		throw error(400, 'Bed is not free');
	}

	const admissionNo = await nextAdmissionNo({
		hospitalId: payload.hospitalId,
		branchId: payload.branchId
	});

	const result = await db.transaction(async (tx) => {
		const [admission] = await tx
			.insert(table.ipdAdmissionTable)
			.values({
				visitId,
				hospitalId: payload.hospitalId,
				branchId: payload.branchId,
				admissionNo,
				wardId: payload.wardId,
				bedId: payload.bedId,
				admittingDoctorId:
					payload.admittingDoctorId ?? visit.doctorId ?? null,
				reasonNotes: payload.reasonNotes ?? null,
				admissionStatus: IpdAdmissionStatusEnum.ADMITTED
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
			fromWardId: null,
			toWardId: payload.wardId,
			movedByStaffId: payload.actorStaffId ?? null,
			remark: 'Initial admission'
		});

		await tx
			.update(table.patientVisitTable)
			.set({
				visitTypeId: VisitTypeEnum.IPD,
				statusTaggingId: VisitStatusTaggingEnum.ADMITTED,
				branchId: payload.branchId
			})
			.where(eq(table.patientVisitTable.id, visitId));

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

	if (
		admission.bedId === payload.toBedId &&
		admission.wardId === payload.toWardId
	) {
		throw error(400, 'Already on this bed');
	}

	const [toWard] = await db
		.select({
			id: table.wardTable.id,
			branchId: table.wardTable.branchId
		})
		.from(table.wardTable)
		.where(
			and(
				eq(table.wardTable.id, payload.toWardId),
				eq(table.wardTable.hospitalId, payload.hospitalId),
				eq(table.wardTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	if (!toWard) throw error(400, 'Target ward not found');
	if (toWard.branchId !== admission.branchId) {
		throw error(400, 'Target ward is not in the admission branch');
	}

	const [toBed] = await db
		.select()
		.from(table.bedTable)
		.where(
			and(
				eq(table.bedTable.id, payload.toBedId),
				eq(table.bedTable.wardId, payload.toWardId),
				eq(table.bedTable.hospitalId, payload.hospitalId),
				eq(table.bedTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	if (!toBed) throw error(400, 'Target bed not found');
	if (toBed.bedStatus !== IpdBedStatusEnum.FREE) {
		throw error(400, 'Target bed is not free');
	}

	return db.transaction(async (tx) => {
		await tx
			.update(table.bedTable)
			.set({ bedStatus: IpdBedStatusEnum.FREE })
			.where(eq(table.bedTable.id, admission.bedId));
		await tx
			.update(table.bedTable)
			.set({ bedStatus: IpdBedStatusEnum.OCCUPIED })
			.where(eq(table.bedTable.id, payload.toBedId));

		await tx.insert(table.ipdBedHistoryTable).values({
			admissionId: admission.id,
			fromBedId: admission.bedId,
			toBedId: payload.toBedId,
			fromWardId: admission.wardId,
			toWardId: payload.toWardId,
			movedByStaffId:
				payload.movedByStaffId ?? payload.actorStaffId ?? null,
			remark: payload.remark ?? null
		});

		const [updated] = await tx
			.update(table.ipdAdmissionTable)
			.set({
				wardId: payload.toWardId,
				bedId: payload.toBedId
			})
			.where(eq(table.ipdAdmissionTable.id, admission.id))
			.returning();
		if (!updated) throw new Error('Transfer update failed');
		return updated;
	});
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

	return db.transaction(async (tx) => {
		await tx
			.update(table.bedTable)
			.set({ bedStatus: IpdBedStatusEnum.FREE })
			.where(eq(table.bedTable.id, admission.bedId));

		const [updated] = await tx
			.update(table.ipdAdmissionTable)
			.set({
				admissionStatus: IpdAdmissionStatusEnum.DISCHARGED,
				dischargedAt: new Date().toISOString()
			})
			.where(eq(table.ipdAdmissionTable.id, admission.id))
			.returning();
		if (!updated) throw new Error('Discharge update failed');

		await tx
			.update(table.patientVisitTable)
			.set({
				statusTaggingId: VisitStatusTaggingEnum.DISCHARGED
			})
			.where(eq(table.patientVisitTable.id, admission.visitId));

		return updated;
	});
}

/** After IP bill print + pharmacy: close the visit (Exit). */
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
	if (visit.statusTaggingId !== VisitStatusTaggingEnum.DISCHARGED) {
		throw error(400, 'Visit must be discharged before close');
	}
	await db
		.update(table.patientVisitTable)
		.set({ statusTaggingId: VisitStatusTaggingEnum.CLOSED })
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
			patientId: table.patientTable.id,
			patientCode: table.patientTable.code,
			patientFirst: table.patientTable.firstName,
			patientMiddle: table.patientTable.middleName,
			patientLast: table.patientTable.lastName,
			branchId: table.ipdAdmissionTable.branchId,
			wardId: table.ipdAdmissionTable.wardId,
			wardName: table.wardTable.name,
			bedId: table.ipdAdmissionTable.bedId,
			bedName: table.bedTable.name,
			admittedAt: table.ipdAdmissionTable.admittedAt,
			doctorFirst: table.staffTable.firstName,
			doctorMiddle: table.staffTable.middleName,
			doctorLast: table.staffTable.lastName,
			admissionStatus: table.ipdAdmissionTable.admissionStatus
		})
		.from(table.ipdAdmissionTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.ipdAdmissionTable.visitId, table.patientVisitTable.id)
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
		patientId: r.patientId,
		patientCode: r.patientCode,
		patientName: [r.patientFirst, r.patientMiddle, r.patientLast]
			.filter(Boolean)
			.join(' '),
		branchId: r.branchId,
		wardId: r.wardId,
		wardName: r.wardName,
		bedId: r.bedId,
		bedName: r.bedName,
		admittedAt: r.admittedAt,
		admittingDoctorName: [r.doctorFirst, r.doctorMiddle, r.doctorLast]
			.filter(Boolean)
			.join(' '),
		admissionStatus: r.admissionStatus
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
