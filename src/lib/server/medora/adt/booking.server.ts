import { error } from '@sveltejs/kit';
import { and, count, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import {
	IpdBedBookingStatusTaggingEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import type {
	AdtBookingCreatePayload,
	AdtBookingRow
} from '$lib/model/type/medora/adt/adt.type';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

function mapRow(r: {
	id: number;
	hospitalId: string;
	branchId: string;
	patientId: string | null;
	patientTitleId: number | null;
	patientName: string | null;
	patientDateOfBirth: string | null;
	patientAgeYear: number | null;
	patientAgeMonth: number | null;
	patientAgeDay: number | null;
	phone: string | null;
	email: string | null;
	preferredWardId: number | null;
	preferredBedId: number | null;
	preferredWardName: string | null;
	preferredBedName: string | null;
	expectedAdmitAt: string | null;
	admittingDoctorId: string | null;
	remark: string | null;
	statusTaggingId: number;
	statusId: number;
}): AdtBookingRow {
	return { ...r };
}

export async function getBookingsPaginated(
	params: PaginationParams & {
		hospitalId: string;
		search?: string;
		statusTaggingId?: number;
	}
): Promise<PaginatedResult<AdtBookingRow>> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const conditions = [
		eq(table.ipdBedBookingTable.hospitalId, params.hospitalId),
		ne(table.ipdBedBookingTable.statusId, StatusEnum.DELETED)
	];
	if (typeof params.statusTaggingId === 'number') {
		conditions.push(
			eq(table.ipdBedBookingTable.statusTaggingId, params.statusTaggingId)
		);
	}
	const search = params.search?.trim();
	if (search) {
		conditions.push(
			or(
				ilike(table.ipdBedBookingTable.patientName, `%${search}%`),
				ilike(table.ipdBedBookingTable.phone, `%${search}%`)
			)!
		);
	}
	const whereClause = and(...conditions);
	const db = ensureDb();
	const [data, countResult] = await Promise.all([
		db
			.select({
				id: table.ipdBedBookingTable.id,
				hospitalId: table.ipdBedBookingTable.hospitalId,
				branchId: table.ipdBedBookingTable.branchId,
				patientId: table.ipdBedBookingTable.patientId,
				patientTitleId: table.ipdBedBookingTable.patientTitleId,
				patientName: table.ipdBedBookingTable.patientName,
				patientDateOfBirth: table.ipdBedBookingTable.patientDateOfBirth,
				patientAgeYear: table.ipdBedBookingTable.patientAgeYear,
				patientAgeMonth: table.ipdBedBookingTable.patientAgeMonth,
				patientAgeDay: table.ipdBedBookingTable.patientAgeDay,
				phone: table.ipdBedBookingTable.phone,
				email: table.ipdBedBookingTable.email,
				preferredWardId: table.ipdBedBookingTable.preferredWardId,
				preferredBedId: table.ipdBedBookingTable.preferredBedId,
				preferredWardName: table.wardTable.name,
				preferredBedName: table.bedTable.name,
				expectedAdmitAt: table.ipdBedBookingTable.expectedAdmitAt,
				admittingDoctorId: table.ipdBedBookingTable.admittingDoctorId,
				remark: table.ipdBedBookingTable.remark,
				statusTaggingId: table.ipdBedBookingTable.statusTaggingId,
				statusId: table.ipdBedBookingTable.statusId
			})
			.from(table.ipdBedBookingTable)
			.leftJoin(
				table.wardTable,
				eq(table.ipdBedBookingTable.preferredWardId, table.wardTable.id)
			)
			.leftJoin(
				table.bedTable,
				eq(table.ipdBedBookingTable.preferredBedId, table.bedTable.id)
			)
			.where(whereClause)
			.orderBy(desc(table.ipdBedBookingTable.id))
			.limit(limit)
			.offset(offset),
		db
			.select({ value: count() })
			.from(table.ipdBedBookingTable)
			.where(whereClause)
	]);
	const total = Number(countResult[0]?.value ?? 0);
	return {
		data: data.map(mapRow),
		total,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(total / pageSize))
	};
}

export async function createBooking(
	input: AdtBookingCreatePayload & { hospitalId: string }
) {
	const patientId = input.patientId?.trim() || null;
	const patientName = input.patientName?.trim() || null;
	if (!patientId && !patientName) {
		throw error(400, 'Select an existing patient or enter a patient name');
	}
	if (!input.branchId) throw error(400, 'Select a branch');

	const [row] = await ensureDb()
		.insert(table.ipdBedBookingTable)
		.values({
			hospitalId: input.hospitalId,
			branchId: input.branchId,
			patientId,
			patientTitleId: input.patientTitleId ?? null,
			patientName,
			patientDateOfBirth: input.patientDateOfBirth || null,
			patientAgeYear: input.patientAgeYear ?? null,
			patientAgeMonth: input.patientAgeMonth ?? null,
			patientAgeDay: input.patientAgeDay ?? null,
			phone: input.phone?.trim() || null,
			email: input.email?.trim() || null,
			preferredWardId: input.preferredWardId ?? null,
			preferredBedId: input.preferredBedId ?? null,
			expectedAdmitAt: input.expectedAdmitAt || null,
			admittingDoctorId: input.admittingDoctorId ?? null,
			remark: input.remark?.trim() || null,
			statusTaggingId:
				input.statusTaggingId ?? IpdBedBookingStatusTaggingEnum.BOOKED
		})
		.returning();
	if (!row) throw error(400, 'Insert failed');
	return row;
}

export async function cancelBooking(input: {
	hospitalId: string;
	id: number;
}) {
	const [row] = await ensureDb()
		.update(table.ipdBedBookingTable)
		.set({
			statusTaggingId: IpdBedBookingStatusTaggingEnum.CANCELLED,
			updatedAt: sql`now()`
		})
		.where(
			and(
				eq(table.ipdBedBookingTable.id, input.id),
				eq(table.ipdBedBookingTable.hospitalId, input.hospitalId),
				ne(table.ipdBedBookingTable.statusId, StatusEnum.DELETED)
			)
		)
		.returning();
	if (!row) throw error(404, 'Booking not found');
	return row;
}
