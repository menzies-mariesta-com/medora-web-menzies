import { error } from '@sveltejs/kit';
import { and, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import {
	IpdAdmissionStatusEnum,
	IpdBedTransferReqStatusTaggingEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import type {
	AdtTransferReqCreatePayload,
	AdtTransferReqRow
} from '$lib/model/type/medora/adt/adt.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { transferBed } from '$lib/server/medora/ipd/admission.server';

export async function getTransferRequisitionsPaginated(
	params: PaginationParams & {
		hospitalId: string;
		statusTaggingId?: number;
	}
): Promise<PaginatedResult<AdtTransferReqRow>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const conditions = [
		eq(table.ipdBedTransferRequisitionTable.hospitalId, params.hospitalId),
		ne(table.ipdBedTransferRequisitionTable.statusId, StatusEnum.DELETED)
	];
	if (typeof params.statusTaggingId === 'number') {
		conditions.push(
			eq(
				table.ipdBedTransferRequisitionTable.statusTaggingId,
				params.statusTaggingId
			)
		);
	}
	const whereClause = and(...conditions);
	const db = ensureDb();

	const [simplified, countResult] = await Promise.all([
		db
			.select({
				id: table.ipdBedTransferRequisitionTable.id,
				hospitalId: table.ipdBedTransferRequisitionTable.hospitalId,
				admissionId: table.ipdBedTransferRequisitionTable.admissionId,
				admissionNo: table.ipdAdmissionTable.admissionNo,
				patientName: table.patientTable.firstName,
				fromBedId: table.ipdBedTransferRequisitionTable.fromBedId,
				toBedId: table.ipdBedTransferRequisitionTable.toBedId,
				toWardId: table.ipdBedTransferRequisitionTable.toWardId,
				requestedByStaffId:
					table.ipdBedTransferRequisitionTable.requestedByStaffId,
				remark: table.ipdBedTransferRequisitionTable.remark,
				statusTaggingId:
					table.ipdBedTransferRequisitionTable.statusTaggingId,
				statusId: table.ipdBedTransferRequisitionTable.statusId
			})
			.from(table.ipdBedTransferRequisitionTable)
			.innerJoin(
				table.ipdAdmissionTable,
				eq(
					table.ipdBedTransferRequisitionTable.admissionId,
					table.ipdAdmissionTable.id
				)
			)
			.innerJoin(
				table.patientVisitTable,
				eq(table.ipdAdmissionTable.visitId, table.patientVisitTable.id)
			)
			.leftJoin(
				table.patientTable,
				eq(table.patientVisitTable.patientId, table.patientTable.id)
			)
			.where(whereClause)
			.orderBy(desc(table.ipdBedTransferRequisitionTable.id))
			.limit(limit)
			.offset(offset),
		db
			.select({ value: count() })
			.from(table.ipdBedTransferRequisitionTable)
			.where(whereClause)
	]);

	const total = Number(countResult[0]?.value ?? 0);
	const bedIds = [
		...new Set(
			simplified.flatMap((r) =>
				[r.fromBedId, r.toBedId].filter(
					(id): id is number => typeof id === 'number'
				)
			)
		)
	];
	const bedNameById = new Map<number, string | null>();
	if (bedIds.length > 0) {
		const beds = await db
			.select({ id: table.bedTable.id, name: table.bedTable.name })
			.from(table.bedTable)
			.where(inArray(table.bedTable.id, bedIds));
		for (const b of beds) bedNameById.set(b.id, b.name);
	}
	const wardIds = [
		...new Set(
			simplified
				.map((r) => r.toWardId)
				.filter((id): id is number => typeof id === 'number')
		)
	];
	const wardNameById = new Map<number, string | null>();
	if (wardIds.length > 0) {
		const wards = await db
			.select({ id: table.wardTable.id, name: table.wardTable.name })
			.from(table.wardTable)
			.where(inArray(table.wardTable.id, wardIds));
		for (const w of wards) wardNameById.set(w.id, w.name);
	}

	return {
		data: simplified.map((r) => ({
			id: r.id,
			hospitalId: r.hospitalId,
			admissionId: r.admissionId,
			admissionNo: r.admissionNo,
			patientName: r.patientName,
			fromBedId: r.fromBedId,
			fromBedName: bedNameById.get(r.fromBedId) ?? null,
			toBedId: r.toBedId,
			toBedName:
				r.toBedId != null ? (bedNameById.get(r.toBedId) ?? null) : null,
			toWardId: r.toWardId,
			toWardName:
				r.toWardId != null
					? (wardNameById.get(r.toWardId) ?? null)
					: null,
			requestedByStaffId: r.requestedByStaffId,
			remark: r.remark,
			statusTaggingId: r.statusTaggingId,
			statusId: r.statusId
		})),
		total,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(total / pageSize))
	};
}

export async function createTransferRequisition(
	input: AdtTransferReqCreatePayload & {
		hospitalId: string;
		requestedByStaffId?: string | null;
	}
) {
	const [admission] = await ensureDb()
		.select()
		.from(table.ipdAdmissionTable)
		.where(
			and(
				eq(table.ipdAdmissionTable.id, input.admissionId),
				eq(table.ipdAdmissionTable.hospitalId, input.hospitalId),
				eq(
					table.ipdAdmissionTable.admissionStatus,
					IpdAdmissionStatusEnum.ADMITTED
				),
				ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!admission) throw error(404, 'Active admission not found');
	if (admission.bedId !== input.fromBedId) {
		throw error(400, 'fromBedId must match the admission current bed');
	}

	const [row] = await ensureDb()
		.insert(table.ipdBedTransferRequisitionTable)
		.values({
			hospitalId: input.hospitalId,
			admissionId: input.admissionId,
			fromBedId: input.fromBedId,
			toBedId: input.toBedId ?? null,
			toWardId: input.toWardId ?? null,
			requestedByStaffId: input.requestedByStaffId ?? null,
			remark: input.remark?.trim() || null,
			statusTaggingId:
				input.statusTaggingId ??
				IpdBedTransferReqStatusTaggingEnum.PENDING
		})
		.returning();
	if (!row) throw error(400, 'Insert failed');
	return row;
}

export async function completeTransferRequisition(input: {
	hospitalId: string;
	id: number;
	actorStaffId?: string | null;
}) {
	const db = ensureDb();
	const [req] = await db
		.select()
		.from(table.ipdBedTransferRequisitionTable)
		.where(
			and(
				eq(table.ipdBedTransferRequisitionTable.id, input.id),
				eq(
					table.ipdBedTransferRequisitionTable.hospitalId,
					input.hospitalId
				),
				ne(
					table.ipdBedTransferRequisitionTable.statusId,
					StatusEnum.DELETED
				)
			)
		)
		.limit(1);
	if (!req) throw error(404, 'Requisition not found');
	if (
		req.statusTaggingId === IpdBedTransferReqStatusTaggingEnum.COMPLETED
	) {
		return req;
	}
	if (
		req.statusTaggingId === IpdBedTransferReqStatusTaggingEnum.CANCELLED
	) {
		throw error(400, 'Cannot complete a cancelled requisition');
	}
	if (req.toBedId == null) {
		throw error(400, 'Assign a destination bed before completing');
	}

	await transferBed({
		hospitalId: input.hospitalId,
		admissionId: req.admissionId,
		toBedId: req.toBedId,
		toWardId: req.toWardId ?? undefined,
		remark: req.remark,
		actorStaffId: input.actorStaffId
	});

	const [updated] = await db
		.update(table.ipdBedTransferRequisitionTable)
		.set({
			statusTaggingId: IpdBedTransferReqStatusTaggingEnum.COMPLETED,
			updatedAt: sql`now()`
		})
		.where(eq(table.ipdBedTransferRequisitionTable.id, req.id))
		.returning();
	return updated;
}

export async function cancelTransferRequisition(input: {
	hospitalId: string;
	id: number;
}) {
	const [row] = await ensureDb()
		.update(table.ipdBedTransferRequisitionTable)
		.set({
			statusTaggingId: IpdBedTransferReqStatusTaggingEnum.CANCELLED,
			updatedAt: sql`now()`
		})
		.where(
			and(
				eq(table.ipdBedTransferRequisitionTable.id, input.id),
				eq(
					table.ipdBedTransferRequisitionTable.hospitalId,
					input.hospitalId
				),
				ne(
					table.ipdBedTransferRequisitionTable.statusId,
					StatusEnum.DELETED
				)
			)
		)
		.returning();
	if (!row) throw error(404, 'Requisition not found');
	return row;
}
