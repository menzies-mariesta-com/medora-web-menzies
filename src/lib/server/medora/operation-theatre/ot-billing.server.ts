import { error } from '@sveltejs/kit';
import {
	and,
	asc,
	desc,
	eq,
	inArray,
	isNotNull,
	ne
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
	BillingStatusTaggingEnum,
	IpdAdmissionStatusEnum,
	OtBookingStatusTaggingEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import type {
	OtBillingCase,
	OtBillingContext,
	OtBillingLine,
	OtBillingSummary,
	OtBloodRequisitionRow,
	OtCaseSheet,
	OtCaseSheetCase
} from '$lib/model/type/medora/operation-theatre.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { saveFormInstance } from '$lib/server/medora/clinical-form/clinical-form.server';
import {
	ageGenderLabel,
	otPaediatrician,
	otProvider,
	otSurgeon,
	patientDisplayNameSql,
	staffDisplayNameSql
} from './ot-shared.server';

const otSignedBy = alias(table.staffTable, 'ot_form_signed_by');
const otAttendingDoctor = alias(table.staffTable, 'ot_attending_doctor');

type VisitHeader = {
	visitId: string;
	visitNo: string | null;
	patientId: string;
	hrn: string | null;
	patientName: string;
	ageGender: string;
	dateOfBirth: string | null;
	mobileNo: string | null;
	address: string | null;
	genderName: string | null;
	branchName: string | null;
	admissionId: number | null;
	admissionNo: string | null;
	admittedAt: string | null;
	dischargedAt: string | null;
	wardName: string | null;
	bedNo: string | null;
	attendingDoctorName: string | null;
	visitDate: string | null;
	visitStatus: string | null;
};

async function loadVisitHeader(input: {
	hospitalId: string;
	visitId: string;
}): Promise<VisitHeader> {
	const [row] = await ensureDb()
		.select({
			visit: table.patientVisitTable,
			hrn: table.patientTable.code,
			patientName: patientDisplayNameSql(),
			dateOfBirth: table.patientTable.dateOfBirth,
			mobileNo: table.patientTable.phonePrimary,
			address: table.patientTable.address,
			genderName: table.genderTable.name,
			branchName: table.hospitalBranchTable.name,
			admission: table.ipdAdmissionTable,
			wardName: table.wardTable.name,
			bedNo: table.bedTable.name,
			attendingDoctorName: staffDisplayNameSql(otAttendingDoctor),
			visitStatus: table.statusTaggingTable.name
		})
		.from(table.patientVisitTable)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.leftJoin(
			table.genderTable,
			eq(table.patientTable.genderId, table.genderTable.id)
		)
		.leftJoin(
			table.hospitalBranchTable,
			eq(table.patientVisitTable.branchId, table.hospitalBranchTable.id)
		)
		.leftJoin(
			table.statusTaggingTable,
			eq(table.patientVisitTable.statusTaggingId, table.statusTaggingTable.id)
		)
		.leftJoin(
			table.ipdAdmissionTable,
			and(
				eq(table.ipdAdmissionTable.visitId, table.patientVisitTable.id),
				ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED)
			)
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
			otAttendingDoctor,
			eq(table.ipdAdmissionTable.admittingDoctorId, otAttendingDoctor.id)
		)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);

	if (!row) throw error(404, 'Encounter not found');

	return {
		visitId: row.visit.id,
		visitNo: row.visit.visitNo,
		patientId: row.visit.patientId,
		hrn: row.hrn,
		patientName: row.patientName ?? '—',
		ageGender: ageGenderLabel({
			dateOfBirth: row.dateOfBirth,
			genderName: row.genderName
		}),
		dateOfBirth: row.dateOfBirth,
		mobileNo: row.mobileNo,
		address: row.address,
		genderName: row.genderName,
		branchName: row.branchName,
		admissionId: row.admission?.id ?? null,
		admissionNo: row.admission?.admissionNo ?? null,
		admittedAt: row.admission?.admittedAt ?? null,
		dischargedAt: row.admission?.dischargedAt ?? null,
		wardName: row.wardName,
		bedNo: row.bedNo,
		attendingDoctorName: row.attendingDoctorName,
		visitDate: row.visit.createdAt,
		visitStatus: row.visitStatus
	};
}

type ProcedureForm = {
	surgicalCaseId: number | null;
	signedAt: string | null;
	signedByName: string | null;
	valuesJson: Record<string, unknown> | null;
};

async function loadProcedureForms(input: {
	hospitalId: string;
	visitId: string;
}): Promise<Map<number, ProcedureForm>> {
	const rows = await ensureDb()
		.select({
			surgicalCaseId: table.clinicalFormInstanceTable.surgicalCaseId,
			signedAt: table.clinicalFormInstanceTable.signedAt,
			signedByName: staffDisplayNameSql(otSignedBy),
			valuesJson: table.clinicalFormInstanceTable.valuesJson
		})
		.from(table.clinicalFormInstanceTable)
		.leftJoin(
			otSignedBy,
			eq(table.clinicalFormInstanceTable.signedBy, otSignedBy.id)
		)
		.where(
			and(
				eq(table.clinicalFormInstanceTable.hospitalId, input.hospitalId),
				eq(table.clinicalFormInstanceTable.visitId, input.visitId),
				eq(
					table.clinicalFormInstanceTable.statusId,
					StatusEnum.ACTIVE
				),
				inArray(table.clinicalFormInstanceTable.contextType, [
					'ot_procedure',
					'procedure_log'
				]),
				isNotNull(table.clinicalFormInstanceTable.surgicalCaseId),
				isNotNull(table.clinicalFormInstanceTable.signedAt)
			)
		)
		.orderBy(desc(table.clinicalFormInstanceTable.signedAt));

	const forms = new Map<number, ProcedureForm>();
	for (const row of rows) {
		const caseId = row.surgicalCaseId;
		if (caseId == null || forms.has(caseId)) continue;
		forms.set(caseId, {
			surgicalCaseId: caseId,
			signedAt: row.signedAt,
			signedByName: row.signedByName,
			valuesJson:
				(row.valuesJson as Record<string, unknown> | null) ?? null
		});
	}
	return forms;
}

async function loadCases(input: {
	hospitalId: string;
	visitId: string;
}): Promise<OtCaseSheetCase[]> {
	const [rows, forms] = await Promise.all([
		ensureDb()
			.select({
				sc: table.surgicalCaseTable,
				theatreName: table.otRoomTable.name,
				surgeonName: staffDisplayNameSql(otSurgeon),
				providerName: staffDisplayNameSql(otProvider),
				paediatricianName: staffDisplayNameSql(otPaediatrician),
				statusName: table.statusTaggingTable.name,
				statusCode: table.statusTaggingTable.code,
				wardName: table.wardTable.name,
				bedNo: table.bedTable.name,
				serviceName: table.serviceItemTable.serviceName
			})
			.from(table.surgicalCaseTable)
			.innerJoin(
				table.patientTable,
				eq(table.surgicalCaseTable.patientId, table.patientTable.id)
			)
			.leftJoin(
				table.otRoomTable,
				eq(table.surgicalCaseTable.otRoomId, table.otRoomTable.id)
			)
			.leftJoin(
				otSurgeon,
				eq(table.surgicalCaseTable.surgeonId, otSurgeon.id)
			)
			.leftJoin(
				otProvider,
				eq(table.surgicalCaseTable.providerId, otProvider.id)
			)
			.leftJoin(
				otPaediatrician,
				eq(
					table.surgicalCaseTable.paediatricianId,
					otPaediatrician.id
				)
			)
			.leftJoin(
				table.statusTaggingTable,
				eq(
					table.surgicalCaseTable.statusTaggingId,
					table.statusTaggingTable.id
				)
			)
			.leftJoin(
				table.ipdAdmissionTable,
				eq(table.surgicalCaseTable.admissionId, table.ipdAdmissionTable.id)
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
				table.serviceItemTable,
				eq(table.surgicalCaseTable.serviceId, table.serviceItemTable.id)
			)
			.where(
				and(
					eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
					eq(table.surgicalCaseTable.visitId, input.visitId),
					ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED)
				)
			)
			.orderBy(
				asc(table.surgicalCaseTable.scheduledStart),
				asc(table.surgicalCaseTable.id)
			),
		loadProcedureForms(input)
	]);

	return rows.map((r) => {
		const form = forms.get(r.sc.id);
		return {
			id: r.sc.id,
			bookingNo: r.sc.bookingNo,
			procedureName: r.sc.procedureName,
			serviceName: r.serviceName,
			otDate: r.sc.otRequestDate ?? r.sc.scheduledStart,
			scheduledStart: r.sc.scheduledStart,
			scheduledEnd: r.sc.scheduledEnd,
			actualStart: r.sc.actualStart,
			actualEnd: r.sc.actualEnd,
			theatreName: r.theatreName,
			surgeonName: r.surgeonName,
			providerName: r.providerName,
			paediatricianName: r.paediatricianName,
			priority: r.sc.priority,
			statusTaggingId: r.sc.statusTaggingId,
			statusName: r.statusName,
			statusCode: r.statusCode,
			wardName: r.wardName,
			bedNo: r.bedNo,
			wardRemarks: r.sc.wardRemarks,
			provisionalDiagnosis: r.sc.provisionalDiagnosis,
			clinicalNotes: r.sc.clinicalNotes,
			wardToOtAt: r.sc.wardToOtAt,
			preOpAcknowledgedAt: r.sc.preOpAcknowledgedAt,
			inOtAt: r.sc.inOtAt,
			postOpAt: r.sc.postOpAt,
			returnedToWardAt: r.sc.returnedToWardAt,
			procedureSignedAt: form?.signedAt ?? null,
			procedureSignedByName: form?.signedByName ?? null,
			procedureNote: form?.valuesJson ?? null
		};
	});
}

async function loadBloodRequisitions(input: {
	hospitalId: string;
	visitId: string;
}): Promise<OtBloodRequisitionRow[]> {
	const rows = await ensureDb()
		.select({
			r: table.otBloodRequisitionTable,
			requestedByName: staffDisplayNameSql(otAttendingDoctor)
		})
		.from(table.otBloodRequisitionTable)
		.innerJoin(
			table.surgicalCaseTable,
			eq(
				table.otBloodRequisitionTable.surgicalCaseId,
				table.surgicalCaseTable.id
			)
		)
		.leftJoin(
			otAttendingDoctor,
			eq(table.otBloodRequisitionTable.requestedBy, otAttendingDoctor.id)
		)
		.where(
			and(
				eq(table.otBloodRequisitionTable.hospitalId, input.hospitalId),
				eq(table.surgicalCaseTable.visitId, input.visitId),
				ne(
					table.otBloodRequisitionTable.statusId,
					StatusEnum.DELETED
				)
			)
		)
		.orderBy(asc(table.otBloodRequisitionTable.id));

	return rows.map((r) => ({
		id: r.r.id,
		surgicalCaseId: r.r.surgicalCaseId,
		bloodGroup: r.r.bloodGroup,
		component: r.r.component,
		units: r.r.units,
		urgency: r.r.urgency,
		notes: r.r.notes,
		requestedAt: r.r.requestedAt,
		requestedByName: r.requestedByName
	}));
}

async function loadBill(input: {
	hospitalId: string;
	visitId: string;
}): Promise<{
	bill: OtBillingSummary | null;
	lines: OtBillingLine[];
	billId: number | null;
}> {
	const [bill] = await ensureDb()
		.select({
			b: table.otBillingTable,
			statusName: table.statusTaggingTable.name
		})
		.from(table.otBillingTable)
		.leftJoin(
			table.statusTaggingTable,
			eq(
				table.otBillingTable.statusTaggingId,
				table.statusTaggingTable.id
			)
		)
		.where(
			and(
				eq(table.otBillingTable.hospitalId, input.hospitalId),
				eq(table.otBillingTable.visitId, input.visitId),
				ne(table.otBillingTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);

	if (!bill) return { bill: null, lines: [], billId: null };

	const lines = await ensureDb()
		.select()
		.from(table.otBillingLineTable)
		.where(
			and(
				eq(table.otBillingLineTable.otBillingId, bill.b.id),
				ne(table.otBillingLineTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(asc(table.otBillingLineTable.id));

	return {
		bill: {
			id: bill.b.id,
			billNo: bill.b.billNo,
			linesSubtotal: bill.b.linesSubtotal,
			discountTypeId: bill.b.discountTypeId,
			discountPercent: bill.b.discountPercent,
			discountAmount: bill.b.discountAmount,
			totalAmount: bill.b.totalAmount,
			statusTaggingId: bill.b.statusTaggingId,
			statusName: bill.statusName,
			transferredAt: bill.b.transferredAt,
			closedAt: bill.b.closedAt
		},
		lines: lines.map((line) => ({
			id: line.id,
			surgicalCaseId: line.surgicalCaseId,
			serviceId: line.serviceId,
			serviceName: line.serviceNameSnapshot,
			serviceAmount: line.serviceAmount,
			serviceTaxAmount: line.serviceTaxAmount,
			quantity: line.quantity,
			lineTotal: line.lineTotal
		})),
		billId: bill.b.id
	};
}

export async function getOtCaseSheet(input: {
	hospitalId: string;
	visitId: string;
}): Promise<OtCaseSheet> {
	const [visit, cases, bloodRequisitions, billState] = await Promise.all([
		loadVisitHeader(input),
		loadCases(input),
		loadBloodRequisitions(input),
		loadBill(input)
	]);

	return {
		...visit,
		cases,
		bloodRequisitions,
		bill: billState.bill
	};
}

async function loadServiceAmounts(input: {
	hospitalId: string;
	branchId: string;
	serviceIds: number[];
}): Promise<Map<number, { amount: string; tax: string }>> {
	if (input.serviceIds.length === 0) return new Map();
	const rows = await ensureDb()
		.select({
			serviceId: table.serviceTaggingTable.serviceId,
			serviceAmount: table.serviceTaggingTable.serviceAmount,
			serviceTaxAmount: table.serviceTaggingTable.serviceTaxAmount,
			validDate: table.serviceTaggingTable.validDate
		})
		.from(table.serviceTaggingTable)
		.innerJoin(
			table.hospitalBranchTable,
			eq(table.serviceTaggingTable.branchId, table.hospitalBranchTable.id)
		)
		.where(
			and(
				eq(table.hospitalBranchTable.hospitalId, input.hospitalId),
				eq(table.serviceTaggingTable.branchId, input.branchId),
				inArray(table.serviceTaggingTable.serviceId, input.serviceIds),
				ne(table.serviceTaggingTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(desc(table.serviceTaggingTable.validDate));

	const today = new Date().toISOString().slice(0, 10);
	const map = new Map<number, { amount: string; tax: string }>();
	for (const row of rows) {
		if (map.has(row.serviceId)) continue;
		if (row.validDate && row.validDate > today) continue;
		map.set(row.serviceId, {
			amount: row.serviceAmount ?? '0',
			tax: row.serviceTaxAmount ?? '0'
		});
	}
	return map;
}

function money(value: string | number | null | undefined): number {
	const n = Number(value ?? 0);
	return Number.isFinite(n) ? n : 0;
}

function toMoneyString(value: number): string {
	return Math.max(0, value).toFixed(2);
}

export async function getOtBillingContext(input: {
	hospitalId: string;
	visitId: string;
}): Promise<OtBillingContext> {
	const [visit, cases, billState] = await Promise.all([
		loadVisitHeader(input),
		loadCases(input),
		loadBill(input)
	]);

	const billedCaseIds = new Set(
		billState.lines
			.map((line) => line.surgicalCaseId)
			.filter((id): id is number => id != null)
	);
	const caseIds = cases.map((c) => c.id);
	// Resolve actual service ids from the surgical cases.
	const caseRows = caseIds.length
		? await ensureDb()
				.select({
					id: table.surgicalCaseTable.id,
					serviceId: table.surgicalCaseTable.serviceId
				})
				.from(table.surgicalCaseTable)
				.where(inArray(table.surgicalCaseTable.id, caseIds))
		: [];
	const serviceIdByCase = new Map(
		caseRows
			.filter((row) => row.serviceId != null)
			.map((row) => [row.id, row.serviceId as number])
	);
	const amountByService = await loadServiceAmounts({
		hospitalId: input.hospitalId,
		branchId:
			(
				await ensureDb()
					.select({ branchId: table.patientVisitTable.branchId })
					.from(table.patientVisitTable)
					.where(eq(table.patientVisitTable.id, input.visitId))
					.limit(1)
			)[0]?.branchId ?? '',
		serviceIds: [...serviceIdByCase.values()]
	});

	const billingCases: OtBillingCase[] = cases.map((c) => {
		const serviceId = serviceIdByCase.get(c.id) ?? null;
		const pricing = serviceId ? amountByService.get(serviceId) : null;
		return {
			...c,
			serviceId,
			serviceAmount: pricing?.amount ?? '0',
			alreadyBilled: billedCaseIds.has(c.id)
		};
	});

	const postOpCases = billingCases.filter(
		(c) => c.statusTaggingId === OtBookingStatusTaggingEnum.POST_OP
	);
	const unsignedCases = postOpCases.filter((c) => !c.procedureSignedAt);
	const billClosed =
		billState.bill?.statusTaggingId === BillingStatusTaggingEnum.CLOSED;
	const billOpen =
		billState.bill?.statusTaggingId === BillingStatusTaggingEnum.OPEN;
	const unbilledCases = postOpCases.filter((c) => !c.alreadyBilled);

	const blockReasons: string[] = [];
	if (postOpCases.length === 0) {
		blockReasons.push('No completed OT procedure is recorded for this encounter.');
	}
	if (unsignedCases.length > 0) {
		blockReasons.push(
			`${unsignedCases.length} completed OT procedure(s) still need a signed procedure note.`
		);
	}
	if (billClosed) {
		blockReasons.push('The OT bill is already closed.');
	}
	if (billState.bill && billOpen && unbilledCases.length === 0) {
		blockReasons.push('All completed OT procedures are already on the bill.');
	}
	if (!billState.bill && postOpCases.length === 0) {
		blockReasons.push('Transfer is available after the OT procedure is completed and signed.');
	}

	const canTransfer =
		postOpCases.length > 0 &&
		unsignedCases.length === 0 &&
		!billClosed &&
		(!billState.bill || unbilledCases.length > 0);
	const canClose = Boolean(
		billState.bill?.id &&
			billOpen &&
			billState.lines.length > 0 &&
			postOpCases.length > 0 &&
			unbilledCases.length === 0
	);
	const canDischarge = Boolean(
		visit.admissionId &&
			!visit.dischargedAt &&
			billClosed &&
			billState.lines.length > 0
	);

	return {
		visitId: visit.visitId,
		visitNo: visit.visitNo,
		patientName: visit.patientName,
		hrn: visit.hrn,
		ageGender: visit.ageGender,
		branchName: visit.branchName,
		admissionId: visit.admissionId,
		admissionNo: visit.admissionNo,
		admittedAt: visit.admittedAt,
		dischargedAt: visit.dischargedAt,
		wardName: visit.wardName,
		bedNo: visit.bedNo,
		cases: billingCases,
		bill: billState.bill,
		lines: billState.lines,
		canTransfer,
		canClose,
		canDischarge,
		blockReasons
	};
}

export async function signOtProcedure(input: {
	hospitalId: string;
	visitId: string;
	caseId: number;
	valuesJson: Record<string, unknown>;
	staffId: string | null;
}) {
	const db = ensureDb();
	const [caseRow] = await db
		.select({
			id: table.surgicalCaseTable.id,
			visitId: table.surgicalCaseTable.visitId,
			statusTaggingId: table.surgicalCaseTable.statusTaggingId
		})
		.from(table.surgicalCaseTable)
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
				eq(table.surgicalCaseTable.visitId, input.visitId),
				ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!caseRow) throw error(404, 'OT case not found');
	if (caseRow.statusTaggingId !== OtBookingStatusTaggingEnum.POST_OP) {
		throw error(400, 'Procedure can be signed only after the OT is completed.');
	}

	const [existing] = await db
		.select({ id: table.clinicalFormInstanceTable.id })
		.from(table.clinicalFormInstanceTable)
		.where(
			and(
				eq(table.clinicalFormInstanceTable.hospitalId, input.hospitalId),
				eq(table.clinicalFormInstanceTable.surgicalCaseId, input.caseId),
				eq(table.clinicalFormInstanceTable.contextType, 'ot_procedure'),
				eq(
					table.clinicalFormInstanceTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		)
		.orderBy(desc(table.clinicalFormInstanceTable.updatedAt))
		.limit(1);

	return saveFormInstance({
		id: existing?.id,
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		surgicalCaseId: input.caseId,
		templateCode: 'ot_procedure_note_v1',
		contextType: 'ot_procedure',
		valuesJson: input.valuesJson,
		sign: true,
		staffId: input.staffId
	});
}

export async function transferOtCharges(input: {
	hospitalId: string;
	visitId: string;
	staffId: string | null;
}): Promise<{ billId: number; added: number }> {
	const db = ensureDb();
	const context = await getOtBillingContext(input);
	if (context.cases.length === 0) {
		throw error(400, 'No OT cases found for this encounter.');
	}
	if (context.bill?.statusTaggingId === BillingStatusTaggingEnum.CLOSED) {
		throw error(409, 'The OT bill is already closed.');
	}
	const postOpCases = context.cases.filter(
		(c) => c.statusTaggingId === OtBookingStatusTaggingEnum.POST_OP
	);
	if (postOpCases.length === 0) {
		throw error(400, 'No completed OT procedure is available to bill.');
	}
	const unsigned = postOpCases.filter((c) => !c.procedureSignedAt);
	if (unsigned.length > 0) {
		throw error(
			409,
			'All completed OT procedures must have a signed procedure note before billing.'
		);
	}

	const [visit] = await db
		.select({
			branchId: table.patientVisitTable.branchId,
			admissionId: table.ipdAdmissionTable.id
		})
		.from(table.patientVisitTable)
		.leftJoin(
			table.ipdAdmissionTable,
			and(
				eq(table.ipdAdmissionTable.visitId, table.patientVisitTable.id),
				eq(
					table.ipdAdmissionTable.admissionStatus,
					IpdAdmissionStatusEnum.ADMITTED
				)
			)
		)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Encounter not found');

	return db.transaction(async (tx) => {
		let billId = context.bill?.id ?? null;
		if (!billId) {
			const [header] = await tx
				.insert(table.otBillingTable)
				.values({
					hospitalId: input.hospitalId,
					branchId: visit.branchId,
					visitId: input.visitId,
					admissionId: visit.admissionId ?? null,
					billNo: `OTB-${new Date()
						.toISOString()
						.slice(0, 10)
						.replaceAll('-', '')}-${String(postOpCases[0]!.id).padStart(5, '0')}`,
					statusTaggingId: BillingStatusTaggingEnum.OPEN,
					transferredAt: new Date().toISOString(),
					transferredBy: input.staffId
				})
				.returning({ id: table.otBillingTable.id });
			billId = header!.id;
		}

		const existingLines =
			billId === context.bill?.id
				? context.lines
				: (
						await tx
							.select({
								surgicalCaseId:
									table.otBillingLineTable.surgicalCaseId
							})
							.from(table.otBillingLineTable)
							.where(
								eq(table.otBillingLineTable.otBillingId, billId)
							)
					).map((line) => ({
						surgicalCaseId: line.surgicalCaseId
					}));
		const billed = new Set(
			existingLines
				.map((line) => line.surgicalCaseId)
				.filter((id): id is number => id != null)
		);

		let added = 0;
		for (const otCase of postOpCases) {
			if (billed.has(otCase.id)) continue;
			const amount = money(otCase.serviceAmount);
			await tx.insert(table.otBillingLineTable).values({
				otBillingId: billId,
				surgicalCaseId: otCase.id,
				serviceId: otCase.serviceId,
				serviceNameSnapshot:
					otCase.serviceName ?? otCase.procedureName,
				serviceAmount: toMoneyString(amount),
				serviceTaxAmount: '0.00',
				quantity: 1,
				lineTotal: toMoneyString(amount)
			});
			added += 1;
		}

		const allLines = await tx
			.select({
				lineTotal: table.otBillingLineTable.lineTotal
			})
			.from(table.otBillingLineTable)
			.where(eq(table.otBillingLineTable.otBillingId, billId));
		const subtotal = allLines.reduce(
			(sum, line) => sum + money(line.lineTotal),
			0
		);
		const discountAmount = money(context.bill?.discountAmount ?? 0);
		await tx
			.update(table.otBillingTable)
			.set({
				linesSubtotal: toMoneyString(subtotal),
				totalAmount: toMoneyString(
					Math.max(0, subtotal - discountAmount)
				),
				transferredAt: new Date().toISOString(),
				transferredBy: input.staffId,
				updatedAt: new Date().toISOString()
			})
			.where(eq(table.otBillingTable.id, billId));

		return { billId, added };
	});
}

export async function applyOtBillingDiscount(input: {
	hospitalId: string;
	visitId: string;
	discountTypeId: number;
	discountPercent: number;
	discountAmount: number;
	staffId: string | null;
}): Promise<OtBillingContext> {
	const db = ensureDb();
	const [bill] = await db
		.select()
		.from(table.otBillingTable)
		.where(
			and(
				eq(table.otBillingTable.hospitalId, input.hospitalId),
				eq(table.otBillingTable.visitId, input.visitId),
				ne(table.otBillingTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!bill) throw error(404, 'OT bill not found. Transfer charges first.');
	if (bill.statusTaggingId === BillingStatusTaggingEnum.CLOSED) {
		throw error(409, 'The OT bill is already closed.');
	}

	const subtotal = money(bill.linesSubtotal);
	let discount = 0;
	if (input.discountTypeId === 2) {
		const percent = Math.min(100, Math.max(0, input.discountPercent));
		discount = (subtotal * percent) / 100;
	} else if (input.discountTypeId === 3) {
		discount = Math.min(subtotal, Math.max(0, input.discountAmount));
	}

	await db
		.update(table.otBillingTable)
		.set({
			discountTypeId: input.discountTypeId,
			discountPercent:
				input.discountTypeId === 2
					? String(Math.min(100, Math.max(0, input.discountPercent)))
					: null,
			discountAmount: toMoneyString(discount),
			totalAmount: toMoneyString(Math.max(0, subtotal - discount)),
			updatedAt: new Date().toISOString()
		})
		.where(eq(table.otBillingTable.id, bill.id));

	return getOtBillingContext(input);
}

export async function closeOtBilling(input: {
	hospitalId: string;
	visitId: string;
	staffId: string | null;
}): Promise<OtBillingContext> {
	const db = ensureDb();
	const context = await getOtBillingContext(input);
	if (!context.bill) {
		throw error(404, 'OT bill not found. Transfer charges first.');
	}
	if (context.bill.statusTaggingId === BillingStatusTaggingEnum.CLOSED) {
		return context;
	}
	if (context.lines.length === 0) {
		throw error(400, 'Cannot close an empty OT bill.');
	}
	const postOpCases = context.cases.filter(
		(c) => c.statusTaggingId === OtBookingStatusTaggingEnum.POST_OP
	);
	const billed = new Set(
		context.lines
			.map((line) => line.surgicalCaseId)
			.filter((id): id is number => id != null)
	);
	const missing = postOpCases.filter((c) => !billed.has(c.id));
	if (missing.length > 0) {
		throw error(
			409,
			'Transfer all completed OT procedures before closing the bill.'
		);
	}
	const unsigned = postOpCases.filter((c) => !c.procedureSignedAt);
	if (unsigned.length > 0) {
		throw error(
			409,
			'All completed OT procedures must be signed before closing the bill.'
		);
	}

	await db
		.update(table.otBillingTable)
		.set({
			statusTaggingId: BillingStatusTaggingEnum.CLOSED,
			closedAt: new Date().toISOString(),
			closedBy: input.staffId,
			updatedAt: new Date().toISOString()
		})
		.where(eq(table.otBillingTable.id, context.bill.id));

	return getOtBillingContext(input);
}

/**
 * Discharge gate: if the encounter has a completed OT case, its charges must be
 * transferred and the OT bill closed before the admission can be discharged.
 */
export async function assertOtBillingReadyForDischarge(input: {
	hospitalId: string;
	visitId: string;
}): Promise<void> {
	const db = ensureDb();
	const [completedCase] = await db
		.select({ id: table.surgicalCaseTable.id })
		.from(table.surgicalCaseTable)
		.where(
			and(
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
				eq(table.surgicalCaseTable.visitId, input.visitId),
				eq(
					table.surgicalCaseTable.statusTaggingId,
					OtBookingStatusTaggingEnum.POST_OP
				),
				ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!completedCase) return;

	const [bill] = await db
		.select({
			statusTaggingId: table.otBillingTable.statusTaggingId
		})
		.from(table.otBillingTable)
		.where(
			and(
				eq(table.otBillingTable.hospitalId, input.hospitalId),
				eq(table.otBillingTable.visitId, input.visitId),
				ne(table.otBillingTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);

	if (!bill) {
		throw error(
			409,
			'Complete OT billing before discharge: transfer OT charges and close the OT bill.'
		);
	}
	if (bill.statusTaggingId !== BillingStatusTaggingEnum.CLOSED) {
		throw error(
			409,
			'Close the OT bill before discharging this patient.'
		);
	}
}

/** Used by the discharge readiness UI. */
export async function isOtBillingReadyForDischarge(input: {
	hospitalId: string;
	visitId: string;
}): Promise<boolean> {
	try {
		await assertOtBillingReadyForDischarge(input);
		return true;
	} catch {
		return false;
	}
}
