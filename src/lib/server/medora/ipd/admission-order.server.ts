import { error } from '@sveltejs/kit';
import { and, count, desc, eq, ilike, ne, or } from 'drizzle-orm';
import {
	IpdAdmissionCareLevelEnum,
	IpdAdmissionOrderStatusTaggingEnum,
	IpdAdmissionUrgencyEnum,
	StatusEnum,
	VisitTypeEnum
} from '$lib/model/enum/db-link';
import type {
	CreateIpdAdmissionOrderPayload,
	IpdAdmissionOrderRow
} from '$lib/model/type/medora/ipd/ipd.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

function patientDisplayName(r: {
	patientFirst: string | null;
	patientMiddle: string | null;
	patientLast: string | null;
}): string {
	return [r.patientFirst, r.patientMiddle, r.patientLast]
		.filter(Boolean)
		.join(' ')
		.trim();
}

function staffDisplayName(r: {
	doctorFirst: string | null;
	doctorMiddle: string | null;
	doctorLast: string | null;
}): string | null {
	const name = [r.doctorFirst, r.doctorMiddle, r.doctorLast]
		.filter(Boolean)
		.join(' ')
		.trim();
	return name || null;
}

export async function createAdmissionOrder(
	payload: CreateIpdAdmissionOrderPayload & { hospitalId: string }
): Promise<IpdAdmissionOrderRow> {
	const db = ensureDb();
	const sourceOpdVisitId = Number(payload.sourceOpdVisitId);
	if (!Number.isFinite(sourceOpdVisitId) || sourceOpdVisitId <= 0) {
		throw error(400, 'sourceOpdVisitId is required');
	}
	const branchId = String(payload.branchId ?? '').trim();
	if (!branchId) throw error(400, 'branchId is required');

	const careLevel = Number(payload.careLevel);
	if (
		![
			IpdAdmissionCareLevelEnum.GENERAL,
			IpdAdmissionCareLevelEnum.SEMI_PRIVATE,
			IpdAdmissionCareLevelEnum.PRIVATE
		].includes(careLevel)
	) {
		throw error(400, 'Invalid care level');
	}
	const urgency = Number(payload.urgency);
	if (
		![
			IpdAdmissionUrgencyEnum.ROUTINE,
			IpdAdmissionUrgencyEnum.URGENT
		].includes(urgency)
	) {
		throw error(400, 'Invalid urgency');
	}

	const [visit] = await db
		.select({
			id: table.patientVisitTable.id,
			patientId: table.patientVisitTable.patientId,
			branchId: table.patientVisitTable.branchId,
			visitTypeId: table.patientVisitTable.visitTypeId,
			hospitalId: table.patientVisitTable.hospitalId
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, sourceOpdVisitId),
				eq(table.patientVisitTable.hospitalId, payload.hospitalId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'OPD visit not found');
	if (visit.visitTypeId !== VisitTypeEnum.OPD) {
		throw error(400, 'Source visit must be OPD');
	}

	const [existingPending] = await db
		.select({ id: table.ipdAdmissionOrderTable.id })
		.from(table.ipdAdmissionOrderTable)
		.where(
			and(
				eq(table.ipdAdmissionOrderTable.hospitalId, payload.hospitalId),
				eq(
					table.ipdAdmissionOrderTable.sourceOpdVisitId,
					visit.id
				),
				eq(
					table.ipdAdmissionOrderTable.statusTaggingId,
					IpdAdmissionOrderStatusTaggingEnum.PENDING
				),
				ne(table.ipdAdmissionOrderTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (existingPending) {
		throw error(
			400,
			'A pending admission order already exists for this OPD visit'
		);
	}

	const preferredWardIdRaw = payload.preferredWardId;
	const preferredWardId =
		typeof preferredWardIdRaw === 'number' &&
		Number.isFinite(preferredWardIdRaw) &&
		preferredWardIdRaw > 0
			? preferredWardIdRaw
			: null;

	try {
		const [inserted] = await db
			.insert(table.ipdAdmissionOrderTable)
			.values({
				hospitalId: payload.hospitalId,
				branchId: visit.branchId || branchId,
				sourceOpdVisitId: visit.id,
				patientId: visit.patientId,
				orderingDoctorId: payload.orderingDoctorId ?? null,
				careLevel,
				urgency,
				preferredWardId,
				notes: payload.notes?.trim() || null,
				statusTaggingId: IpdAdmissionOrderStatusTaggingEnum.PENDING
			})
			.returning({ id: table.ipdAdmissionOrderTable.id });
		if (!inserted) throw new Error('Insert failed');
		const row = await getAdmissionOrderById({
			hospitalId: payload.hospitalId,
			id: inserted.id
		});
		if (!row) throw new Error('Order not found after insert');
		return row;
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : String(e);
		if (/unique|duplicate/i.test(msg)) {
			throw error(
				400,
				'A pending admission order already exists for this OPD visit'
			);
		}
		throw e;
	}
}

export async function getPendingAdmissionOrderBySourceOpdVisit(input: {
	hospitalId: string;
	sourceOpdVisitId: number;
}): Promise<IpdAdmissionOrderRow | null> {
	const rows = await listAdmissionOrdersPaginated({
		hospitalId: input.hospitalId,
		page: 1,
		pageSize: 1,
		sourceOpdVisitId: input.sourceOpdVisitId,
		statusTaggingId: IpdAdmissionOrderStatusTaggingEnum.PENDING
	});
	return rows.data[0] ?? null;
}

export async function getAdmissionOrderById(input: {
	hospitalId: string;
	id: number;
}): Promise<IpdAdmissionOrderRow | null> {
	const rows = await listAdmissionOrdersPaginated({
		hospitalId: input.hospitalId,
		page: 1,
		pageSize: 1,
		id: input.id
	});
	return rows.data[0] ?? null;
}

export async function listAdmissionOrdersPaginated(
	params: PaginationParams & {
		hospitalId: string;
		search?: string;
		statusTaggingId?: number;
		id?: number;
		sourceOpdVisitId?: number;
	}
): Promise<PaginatedResult<IpdAdmissionOrderRow>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const conditions = [
		eq(table.ipdAdmissionOrderTable.hospitalId, params.hospitalId),
		ne(table.ipdAdmissionOrderTable.statusId, StatusEnum.DELETED)
	];
	if (typeof params.id === 'number') {
		conditions.push(eq(table.ipdAdmissionOrderTable.id, params.id));
	}
	if (
		typeof params.sourceOpdVisitId === 'number' &&
		Number.isFinite(params.sourceOpdVisitId) &&
		params.sourceOpdVisitId > 0
	) {
		conditions.push(
			eq(
				table.ipdAdmissionOrderTable.sourceOpdVisitId,
				params.sourceOpdVisitId
			)
		);
	}
	if (typeof params.statusTaggingId === 'number') {
		conditions.push(
			eq(
				table.ipdAdmissionOrderTable.statusTaggingId,
				params.statusTaggingId
			)
		);
	}
	const search = params.search?.trim();
	if (search) {
		conditions.push(
			or(
				ilike(table.patientTable.code, `%${search}%`),
				ilike(table.patientTable.firstName, `%${search}%`),
				ilike(table.patientTable.lastName, `%${search}%`),
				ilike(table.patientVisitTable.visitNo, `%${search}%`)
			)!
		);
	}
	const whereClause = and(...conditions);
	const db = ensureDb();

	const [data, countResult] = await Promise.all([
		db
			.select({
				id: table.ipdAdmissionOrderTable.id,
				hospitalId: table.ipdAdmissionOrderTable.hospitalId,
				branchId: table.ipdAdmissionOrderTable.branchId,
				sourceOpdVisitId: table.ipdAdmissionOrderTable.sourceOpdVisitId,
				sourceOpdVisitNo: table.patientVisitTable.visitNo,
				patientId: table.ipdAdmissionOrderTable.patientId,
				patientCode: table.patientTable.code,
				patientFirst: table.patientTable.firstName,
				patientMiddle: table.patientTable.middleName,
				patientLast: table.patientTable.lastName,
				orderingDoctorId: table.ipdAdmissionOrderTable.orderingDoctorId,
				doctorFirst: table.staffTable.firstName,
				doctorMiddle: table.staffTable.middleName,
				doctorLast: table.staffTable.lastName,
				careLevel: table.ipdAdmissionOrderTable.careLevel,
				urgency: table.ipdAdmissionOrderTable.urgency,
				preferredWardId: table.ipdAdmissionOrderTable.preferredWardId,
				preferredWardName: table.wardTable.name,
				notes: table.ipdAdmissionOrderTable.notes,
				admissionId: table.ipdAdmissionOrderTable.admissionId,
				statusTaggingId: table.ipdAdmissionOrderTable.statusTaggingId,
				createdAt: table.ipdAdmissionOrderTable.createdAt
			})
			.from(table.ipdAdmissionOrderTable)
			.innerJoin(
				table.patientVisitTable,
				eq(
					table.ipdAdmissionOrderTable.sourceOpdVisitId,
					table.patientVisitTable.id
				)
			)
			.innerJoin(
				table.patientTable,
				eq(table.ipdAdmissionOrderTable.patientId, table.patientTable.id)
			)
			.leftJoin(
				table.staffTable,
				eq(
					table.ipdAdmissionOrderTable.orderingDoctorId,
					table.staffTable.id
				)
			)
			.leftJoin(
				table.wardTable,
				eq(
					table.ipdAdmissionOrderTable.preferredWardId,
					table.wardTable.id
				)
			)
			.where(whereClause)
			.orderBy(desc(table.ipdAdmissionOrderTable.id))
			.limit(limit)
			.offset(offset),
		db
			.select({ n: count() })
			.from(table.ipdAdmissionOrderTable)
			.innerJoin(
				table.patientVisitTable,
				eq(
					table.ipdAdmissionOrderTable.sourceOpdVisitId,
					table.patientVisitTable.id
				)
			)
			.innerJoin(
				table.patientTable,
				eq(table.ipdAdmissionOrderTable.patientId, table.patientTable.id)
			)
			.where(whereClause)
	]);

	return {
		data: data.map((r) => ({
			id: r.id,
			hospitalId: r.hospitalId,
			branchId: r.branchId,
			sourceOpdVisitId: r.sourceOpdVisitId,
			sourceOpdVisitNo: r.sourceOpdVisitNo,
			patientId: r.patientId,
			patientCode: r.patientCode,
			patientName: patientDisplayName(r),
			orderingDoctorId: r.orderingDoctorId,
			orderingDoctorName: staffDisplayName(r),
			careLevel: r.careLevel,
			urgency: r.urgency,
			preferredWardId: r.preferredWardId,
			preferredWardName: r.preferredWardName,
			notes: r.notes,
			admissionId: r.admissionId,
			statusTaggingId: r.statusTaggingId,
			createdAt: r.createdAt
		})),
		total: Number(countResult[0]?.n ?? 0),
		page,
		pageSize,
		totalPages: Math.max(
			1,
			Math.ceil(Number(countResult[0]?.n ?? 0) / pageSize)
		)
	};
}

export async function cancelAdmissionOrder(input: {
	hospitalId: string;
	id: number;
}): Promise<void> {
	const db = ensureDb();
	const [order] = await db
		.select({
			id: table.ipdAdmissionOrderTable.id,
			statusTaggingId: table.ipdAdmissionOrderTable.statusTaggingId
		})
		.from(table.ipdAdmissionOrderTable)
		.where(
			and(
				eq(table.ipdAdmissionOrderTable.id, input.id),
				eq(table.ipdAdmissionOrderTable.hospitalId, input.hospitalId),
				ne(table.ipdAdmissionOrderTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!order) throw error(404, 'Admission order not found');
	if (
		order.statusTaggingId !== IpdAdmissionOrderStatusTaggingEnum.PENDING
	) {
		throw error(400, 'Only pending orders can be cancelled');
	}
	await db
		.update(table.ipdAdmissionOrderTable)
		.set({
			statusTaggingId: IpdAdmissionOrderStatusTaggingEnum.CANCELLED
		})
		.where(eq(table.ipdAdmissionOrderTable.id, input.id));
}
