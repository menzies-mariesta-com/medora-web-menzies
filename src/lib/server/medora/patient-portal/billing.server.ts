import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PatientPortalContext } from './require-patient-context.server';

export type PatientBillType = 'op' | 'ip';

function mapOpBill(row: {
	id: number;
	billNo: string | null;
	visitId: string;
	linesSubtotal: string;
	discountAmount: string;
	totalAmount: string;
	createdAt: string;
	statusTagging?: { name: string | null } | null;
	visit?: { visitNo: string | null } | null;
}) {
	return {
		id: row.id,
		type: 'op' as const,
		billNo: row.billNo,
		visitId: row.visitId,
		visitNo: row.visit?.visitNo ?? null,
		linesSubtotal: row.linesSubtotal,
		discountAmount: row.discountAmount,
		totalAmount: row.totalAmount,
		advanceAppliedAmount: null,
		amountPaid: null,
		statusName: row.statusTagging?.name ?? null,
		createdAt: row.createdAt
	};
}

function mapIpBill(row: {
	id: number;
	billNo: string | null;
	visitId: string;
	linesSubtotal: string;
	discountAmount: string;
	totalAmount: string;
	advanceAppliedAmount: string;
	amountPaid: string;
	createdAt: string;
	statusTagging?: { name: string | null } | null;
	visit?: { visitNo: string | null } | null;
}) {
	return {
		id: row.id,
		type: 'ip' as const,
		billNo: row.billNo,
		visitId: row.visitId,
		visitNo: row.visit?.visitNo ?? null,
		linesSubtotal: row.linesSubtotal,
		discountAmount: row.discountAmount,
		totalAmount: row.totalAmount,
		advanceAppliedAmount: row.advanceAppliedAmount,
		amountPaid: row.amountPaid,
		statusName: row.statusTagging?.name ?? null,
		createdAt: row.createdAt
	};
}

export async function listPatientBills(ctx: PatientPortalContext) {
	const visits = await ensureDb()
		.select({ id: table.patientVisitTable.id })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.patientId, ctx.patientId),
				eq(table.patientVisitTable.hospitalId, ctx.hospitalId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		);
	const visitIds = visits.map((v) => v.id);
	if (visitIds.length === 0) return [];

	const [opRows, ipRows] = await Promise.all([
		ensureDb().query.opBillingTable.findMany({
			where: and(
				eq(table.opBillingTable.hospitalId, ctx.hospitalId),
				inArray(table.opBillingTable.visitId, visitIds),
				ne(table.opBillingTable.statusId, StatusEnum.DELETED)
			),
			with: { statusTagging: true, visit: true },
			orderBy: desc(table.opBillingTable.createdAt)
		}),
		ensureDb().query.ipBillingTable.findMany({
			where: and(
				eq(table.ipBillingTable.hospitalId, ctx.hospitalId),
				inArray(table.ipBillingTable.visitId, visitIds),
				ne(table.ipBillingTable.statusId, StatusEnum.DELETED)
			),
			with: { statusTagging: true, visit: true },
			orderBy: desc(table.ipBillingTable.createdAt)
		})
	]);

	return [...opRows.map(mapOpBill), ...ipRows.map(mapIpBill)].sort(
		(a, b) => String(b.createdAt).localeCompare(String(a.createdAt))
	);
}

function mapBillLine(line: {
	serviceNameSnapshot: string | null;
	subCategoryNameSnapshot: string | null;
	serviceAmount: string | null;
	serviceTaxAmount: string | null;
	discount: string | null;
	lineTotal: string;
	serviceUnit: number | null;
}) {
	return {
		serviceName: line.serviceNameSnapshot,
		subCategoryName: line.subCategoryNameSnapshot,
		serviceAmount: line.serviceAmount,
		serviceTaxAmount: line.serviceTaxAmount,
		discount: line.discount,
		lineTotal: line.lineTotal,
		quantity: line.serviceUnit
	};
}

export async function getPatientBillDetail(
	ctx: PatientPortalContext,
	billType: PatientBillType,
	billId: number
) {
	if (billType === 'ip') {
		const row = await ensureDb().query.ipBillingTable.findFirst({
			where: and(
				eq(table.ipBillingTable.id, billId),
				eq(table.ipBillingTable.hospitalId, ctx.hospitalId),
				ne(table.ipBillingTable.statusId, StatusEnum.DELETED)
			),
			with: {
				statusTagging: true,
				visit: true,
				branch: true,
				lines: true
			}
		});
		if (!row || row.visit?.patientId !== ctx.patientId) return null;
		return {
			...mapIpBill(row),
			branchName: row.branch?.name ?? null,
			lines: row.lines
				.slice()
				.sort((a, b) => a.lineIndex - b.lineIndex)
				.map(mapBillLine)
		};
	}

	const row = await ensureDb().query.opBillingTable.findFirst({
		where: and(
			eq(table.opBillingTable.id, billId),
			eq(table.opBillingTable.hospitalId, ctx.hospitalId),
			ne(table.opBillingTable.statusId, StatusEnum.DELETED)
		),
		with: {
			statusTagging: true,
			visit: true,
			branch: true,
			lines: true
		}
	});
	if (!row || row.visit?.patientId !== ctx.patientId) return null;
	return {
		...mapOpBill(row),
		branchName: row.branch?.name ?? null,
		lines: row.lines
			.slice()
			.sort((a, b) => a.lineIndex - b.lineIndex)
			.map(mapBillLine)
	};
}
