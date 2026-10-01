import { error } from '@sveltejs/kit';
import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import {
	IpdAdmissionStatusEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import type {
	CreateIpAdvanceDepositPayload,
	IpAdvanceDepositRow
} from '$lib/model/type/medora/ipd/ipd.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

function staffDisplayName(r: {
	staffFirst: string | null;
	staffMiddle: string | null;
	staffLast: string | null;
}): string | null {
	const name = [r.staffFirst, r.staffMiddle, r.staffLast]
		.filter(Boolean)
		.join(' ')
		.trim();
	return name || null;
}

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

function mapJoinedRow(r: {
	id: number;
	hospitalId: string;
	admissionId: number;
	visitId: number;
	amount: string;
	paymentMethod: string;
	receiptNo: string | null;
	paidAt: string;
	notes: string | null;
	paidByStaffId: string | null;
	staffFirst: string | null;
	staffMiddle: string | null;
	staffLast: string | null;
	visitNo: string | null;
	admissionNo: string | null;
	patientFirst: string | null;
	patientMiddle: string | null;
	patientLast: string | null;
	patientCode: string | null;
}): IpAdvanceDepositRow {
	return {
		id: r.id,
		hospitalId: r.hospitalId,
		admissionId: r.admissionId,
		visitId: r.visitId,
		amount: r.amount,
		paymentMethod: r.paymentMethod,
		receiptNo: r.receiptNo,
		paidAt: r.paidAt,
		notes: r.notes,
		paidByStaffId: r.paidByStaffId,
		paidByStaffName: staffDisplayName(r),
		visitNo: r.visitNo,
		admissionNo: r.admissionNo,
		patientName: patientDisplayName(r) || null,
		patientCode: r.patientCode
	};
}

async function getDepositRowById(input: {
	hospitalId: string;
	id: number;
}): Promise<IpAdvanceDepositRow | null> {
	const [row] = await ensureDb()
		.select({
			id: table.ipAdvanceDepositTable.id,
			hospitalId: table.ipAdvanceDepositTable.hospitalId,
			admissionId: table.ipAdvanceDepositTable.admissionId,
			visitId: table.ipAdvanceDepositTable.visitId,
			amount: table.ipAdvanceDepositTable.amount,
			paymentMethod: table.ipAdvanceDepositTable.paymentMethod,
			receiptNo: table.ipAdvanceDepositTable.receiptNo,
			paidAt: table.ipAdvanceDepositTable.paidAt,
			notes: table.ipAdvanceDepositTable.notes,
			paidByStaffId: table.ipAdvanceDepositTable.paidByStaffId,
			staffFirst: table.staffTable.firstName,
			staffMiddle: table.staffTable.middleName,
			staffLast: table.staffTable.lastName,
			visitNo: table.patientVisitTable.visitNo,
			admissionNo: table.ipdAdmissionTable.admissionNo,
			patientFirst: table.patientTable.firstName,
			patientMiddle: table.patientTable.middleName,
			patientLast: table.patientTable.lastName,
			patientCode: table.patientTable.code
		})
		.from(table.ipAdvanceDepositTable)
		.innerJoin(
			table.ipdAdmissionTable,
			eq(
				table.ipAdvanceDepositTable.admissionId,
				table.ipdAdmissionTable.id
			)
		)
		.innerJoin(
			table.patientVisitTable,
			eq(
				table.ipAdvanceDepositTable.visitId,
				table.patientVisitTable.id
			)
		)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.leftJoin(
			table.staffTable,
			eq(
				table.ipAdvanceDepositTable.paidByStaffId,
				table.staffTable.id
			)
		)
		.where(
			and(
				eq(table.ipAdvanceDepositTable.id, input.id),
				eq(table.ipAdvanceDepositTable.hospitalId, input.hospitalId),
				ne(table.ipAdvanceDepositTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	return row ? mapJoinedRow(row) : null;
}

export async function resolveAdmissionIdForVisit(input: {
	hospitalId: string;
	visitId: number;
}): Promise<number | null> {
	const [admission] = await ensureDb()
		.select({ id: table.ipdAdmissionTable.id })
		.from(table.ipdAdmissionTable)
		.where(
			and(
				eq(table.ipdAdmissionTable.visitId, input.visitId),
				eq(table.ipdAdmissionTable.hospitalId, input.hospitalId),
				ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED),
				or(
					eq(
						table.ipdAdmissionTable.admissionStatus,
						IpdAdmissionStatusEnum.ADMITTED
					),
					eq(
						table.ipdAdmissionTable.admissionStatus,
						IpdAdmissionStatusEnum.DISCHARGED
					)
				)
			)
		)
		.orderBy(desc(table.ipdAdmissionTable.id))
		.limit(1);
	return admission?.id ?? null;
}

export async function createIpAdvanceDeposit(
	payload: CreateIpAdvanceDepositPayload & {
		hospitalId: string;
		paidByStaffId?: string | null;
		visitId?: number | null;
	}
): Promise<IpAdvanceDepositRow> {
	const db = ensureDb();
	let admissionId = Number(payload.admissionId);
	if (
		(!Number.isFinite(admissionId) || admissionId <= 0) &&
		typeof payload.visitId === 'number' &&
		Number.isFinite(payload.visitId) &&
		payload.visitId > 0
	) {
		const resolved = await resolveAdmissionIdForVisit({
			hospitalId: payload.hospitalId,
			visitId: payload.visitId
		});
		if (resolved == null) {
			throw error(400, 'No IPD admission for this visit');
		}
		admissionId = resolved;
	}
	if (!Number.isFinite(admissionId) || admissionId <= 0) {
		throw error(400, 'admissionId is required');
	}
	const amountN = Math.round(Number(payload.amount) * 100) / 100;
	if (!Number.isFinite(amountN) || amountN <= 0) {
		throw error(400, 'amount must be greater than 0');
	}
	const paymentMethod =
		String(payload.paymentMethod ?? 'cash').trim() || 'cash';

	const [admission] = await db
		.select({
			id: table.ipdAdmissionTable.id,
			visitId: table.ipdAdmissionTable.visitId,
			admissionStatus: table.ipdAdmissionTable.admissionStatus
		})
		.from(table.ipdAdmissionTable)
		.where(
			and(
				eq(table.ipdAdmissionTable.id, admissionId),
				eq(table.ipdAdmissionTable.hospitalId, payload.hospitalId),
				ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!admission) throw error(404, 'Admission not found');
	if (
		admission.admissionStatus !== IpdAdmissionStatusEnum.ADMITTED &&
		admission.admissionStatus !== IpdAdmissionStatusEnum.DISCHARGED
	) {
		throw error(400, 'Cannot collect deposit for this admission');
	}

	const receiptNo = `IPADV-${admissionId}-${Date.now()}`;
	const [inserted] = await db
		.insert(table.ipAdvanceDepositTable)
		.values({
			hospitalId: payload.hospitalId,
			admissionId: admission.id,
			visitId: admission.visitId,
			amount: String(amountN),
			paymentMethod,
			receiptNo,
			paidByStaffId: payload.paidByStaffId ?? null,
			notes: payload.notes?.trim() || null
		})
		.returning({ id: table.ipAdvanceDepositTable.id });
	if (!inserted) throw new Error('Deposit insert failed');
	const row = await getDepositRowById({
		hospitalId: payload.hospitalId,
		id: inserted.id
	});
	if (!row) throw new Error('Deposit not found after insert');
	return row;
}

export async function listIpAdvanceDeposits(input: {
	hospitalId: string;
	admissionId?: number;
	visitId?: number;
	search?: string;
}): Promise<IpAdvanceDepositRow[]> {
	const conditions = [
		eq(table.ipAdvanceDepositTable.hospitalId, input.hospitalId),
		ne(table.ipAdvanceDepositTable.statusId, StatusEnum.DELETED)
	];
	if (
		typeof input.admissionId === 'number' &&
		Number.isFinite(input.admissionId) &&
		input.admissionId > 0
	) {
		conditions.push(
			eq(table.ipAdvanceDepositTable.admissionId, input.admissionId)
		);
	}
	if (
		typeof input.visitId === 'number' &&
		Number.isFinite(input.visitId) &&
		input.visitId > 0
	) {
		conditions.push(eq(table.ipAdvanceDepositTable.visitId, input.visitId));
	}
	const search = input.search?.trim();
	if (search) {
		conditions.push(
			or(
				ilike(table.ipAdvanceDepositTable.receiptNo, `%${search}%`),
				ilike(table.patientTable.code, `%${search}%`),
				ilike(table.patientTable.firstName, `%${search}%`),
				ilike(table.patientTable.lastName, `%${search}%`),
				ilike(table.patientVisitTable.visitNo, `%${search}%`),
				ilike(table.ipdAdmissionTable.admissionNo, `%${search}%`)
			)!
		);
	}

	const rows = await ensureDb()
		.select({
			id: table.ipAdvanceDepositTable.id,
			hospitalId: table.ipAdvanceDepositTable.hospitalId,
			admissionId: table.ipAdvanceDepositTable.admissionId,
			visitId: table.ipAdvanceDepositTable.visitId,
			amount: table.ipAdvanceDepositTable.amount,
			paymentMethod: table.ipAdvanceDepositTable.paymentMethod,
			receiptNo: table.ipAdvanceDepositTable.receiptNo,
			paidAt: table.ipAdvanceDepositTable.paidAt,
			notes: table.ipAdvanceDepositTable.notes,
			paidByStaffId: table.ipAdvanceDepositTable.paidByStaffId,
			staffFirst: table.staffTable.firstName,
			staffMiddle: table.staffTable.middleName,
			staffLast: table.staffTable.lastName,
			visitNo: table.patientVisitTable.visitNo,
			admissionNo: table.ipdAdmissionTable.admissionNo,
			patientFirst: table.patientTable.firstName,
			patientMiddle: table.patientTable.middleName,
			patientLast: table.patientTable.lastName,
			patientCode: table.patientTable.code
		})
		.from(table.ipAdvanceDepositTable)
		.innerJoin(
			table.ipdAdmissionTable,
			eq(
				table.ipAdvanceDepositTable.admissionId,
				table.ipdAdmissionTable.id
			)
		)
		.innerJoin(
			table.patientVisitTable,
			eq(
				table.ipAdvanceDepositTable.visitId,
				table.patientVisitTable.id
			)
		)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.leftJoin(
			table.staffTable,
			eq(
				table.ipAdvanceDepositTable.paidByStaffId,
				table.staffTable.id
			)
		)
		.where(and(...conditions))
		.orderBy(desc(table.ipAdvanceDepositTable.paidAt));
	return rows.map(mapJoinedRow);
}

export async function sumIpAdvanceDepositsForAdmission(input: {
	hospitalId: string;
	admissionId: number;
}): Promise<number> {
	const [row] = await ensureDb()
		.select({
			total: sql<string>`coalesce(sum(${table.ipAdvanceDepositTable.amount}), 0)::text`
		})
		.from(table.ipAdvanceDepositTable)
		.where(
			and(
				eq(table.ipAdvanceDepositTable.hospitalId, input.hospitalId),
				eq(table.ipAdvanceDepositTable.admissionId, input.admissionId),
				ne(table.ipAdvanceDepositTable.statusId, StatusEnum.DELETED)
			)
		);
	return Math.round(Number(row?.total ?? 0) * 100) / 100;
}

export async function sumIpAdvanceDepositsForVisit(input: {
	hospitalId: string;
	visitId: number;
}): Promise<number> {
	const [row] = await ensureDb()
		.select({
			total: sql<string>`coalesce(sum(${table.ipAdvanceDepositTable.amount}), 0)::text`
		})
		.from(table.ipAdvanceDepositTable)
		.where(
			and(
				eq(table.ipAdvanceDepositTable.hospitalId, input.hospitalId),
				eq(table.ipAdvanceDepositTable.visitId, input.visitId),
				ne(table.ipAdvanceDepositTable.statusId, StatusEnum.DELETED)
			)
		);
	return Math.round(Number(row?.total ?? 0) * 100) / 100;
}
