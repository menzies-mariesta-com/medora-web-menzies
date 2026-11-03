import {
	BillingStatusTaggingEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import type { PatientOpenBillRow } from '$lib/model/type/medora/billing-context.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, eq, inArray, ne } from 'drizzle-orm';

function draftPayableTotal(
	totalAmount: string | null | undefined,
	linesSubtotal: string | null | undefined
): string {
	const total = Number(totalAmount ?? 0);
	if (Number.isFinite(total) && total > 0) {
		return total.toFixed(2);
	}
	const sub = Number(linesSubtotal ?? 0);
	return Number.isFinite(sub) ? sub.toFixed(2) : '0.00';
}

export function sumMoneyStrings(values: string[]): string {
	let sum = 0;
	for (const v of values) {
		const n = Number(v);
		if (Number.isFinite(n)) sum += n;
	}
	return sum.toFixed(2);
}

async function visitIdsForPatient(
	hospitalId: string,
	patientId: string,
	db: ReturnType<typeof ensureDb>
): Promise<string[]> {
	const rows = await db
		.select({ id: table.patientVisitTable.id })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.hospitalId, hospitalId),
				eq(table.patientVisitTable.patientId, patientId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		);
	return rows.map((r) => r.id);
}

export async function listPatientOpenBills(input: {
	hospitalId: string;
	patientId: string;
	db?: ReturnType<typeof ensureDb>;
}): Promise<PatientOpenBillRow[]> {
	const db = input.db ?? ensureDb();
	const visitIds = await visitIdsForPatient(
		input.hospitalId,
		input.patientId,
		db
	);
	if (visitIds.length === 0) return [];

	const [visits, openOp, openIp] = await Promise.all([
		db
			.select({
				id: table.patientVisitTable.id,
				visitNo: table.patientVisitTable.visitNo,
				visitTypeId: table.patientVisitTable.visitTypeId
			})
			.from(table.patientVisitTable)
			.where(inArray(table.patientVisitTable.id, visitIds)),
		db
			.select({
				visitId: table.opBillingTable.visitId,
				billNo: table.opBillingTable.billNo,
				id: table.opBillingTable.id,
				totalAmount: table.opBillingTable.totalAmount,
				linesSubtotal: table.opBillingTable.linesSubtotal
			})
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
			),
		db
			.select({
				visitId: table.ipBillingTable.visitId,
				billNo: table.ipBillingTable.billNo,
				id: table.ipBillingTable.id,
				totalAmount: table.ipBillingTable.totalAmount,
				linesSubtotal: table.ipBillingTable.linesSubtotal
			})
			.from(table.ipBillingTable)
			.where(
				and(
					inArray(table.ipBillingTable.visitId, visitIds),
					eq(
						table.ipBillingTable.statusTaggingId,
						BillingStatusTaggingEnum.OPEN
					),
					ne(table.ipBillingTable.statusId, StatusEnum.DELETED)
				)
			)
	]);

	const visitById = new Map(visits.map((v) => [v.id, v]));
	const rows: PatientOpenBillRow[] = [];

	for (const b of openOp) {
		const v = visitById.get(b.visitId);
		if (!v) continue;
		rows.push({
			visitId: b.visitId,
			visitNo: v.visitNo,
			visitTypeId: v.visitTypeId,
			billKind: 'op',
			billId: b.id,
			billNo: b.billNo,
			draftTotal: draftPayableTotal(b.totalAmount, b.linesSubtotal)
		});
	}
	for (const b of openIp) {
		const v = visitById.get(b.visitId);
		if (!v) continue;
		rows.push({
			visitId: b.visitId,
			visitNo: v.visitNo,
			visitTypeId: v.visitTypeId,
			billKind: 'ip',
			billId: b.id,
			billNo: b.billNo,
			draftTotal: draftPayableTotal(b.totalAmount, b.linesSubtotal)
		});
	}

	rows.sort((a, b) => {
		const na = a.visitNo ?? '';
		const nb = b.visitNo ?? '';
		return na.localeCompare(nb) || a.visitId.localeCompare(b.visitId);
	});
	return rows;
}

export async function patientHasOpenBill(input: {
	hospitalId: string;
	patientId: string;
	db?: ReturnType<typeof ensureDb>;
}): Promise<{ hasOpen: boolean; sample?: PatientOpenBillRow }> {
	const open = await listPatientOpenBills(input);
	return {
		hasOpen: open.length > 0,
		sample: open[0]
	};
}
