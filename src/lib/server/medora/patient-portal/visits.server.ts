import { and, asc, desc, eq, isNotNull, ne, or } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { listReleasedResultsForVisit } from '$lib/server/medora/diagnostics/lab-result.server';
import type { PatientPortalContext } from './require-patient-context.server';
import {
	listPatientAllergies,
	listPatientMedications,
	listPatientVitals
} from './clinical.server';
import {
	contentTypeFromStorageKey,
	patientAttachmentStorageKey,
	PATIENT_DOCUMENT_CONTENT_PREFIX
} from './documents.server';

function doctorDisplayName(
	doctor: {
		firstName?: string | null;
		middleName?: string | null;
		lastName?: string | null;
		title?: { name?: string | null } | null;
	} | null
): string | null {
	if (!doctor) return null;
	const parts = [
		doctor.title?.name,
		doctor.firstName,
		doctor.middleName,
		doctor.lastName
	].filter(Boolean);
	const name = parts.join(' ').trim();
	return name || null;
}

function text(value: string | null | undefined): string | null {
	return value?.trim() ? value : null;
}

function distinctTexts(values: (string | null | undefined)[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const value of values) {
		const trimmed = value?.trim();
		if (!trimmed) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(trimmed);
	}
	return out;
}

export async function listPatientVisits(ctx: PatientPortalContext) {
	const rows = await ensureDb().query.patientVisitTable.findMany({
		where: and(
			eq(table.patientVisitTable.patientId, ctx.patientId),
			eq(table.patientVisitTable.hospitalId, ctx.hospitalId),
			ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
		),
		orderBy: [desc(table.patientVisitTable.createdAt)],
		with: {
			branch: true,
			visitType: true,
			doctor: { with: { title: true } },
			status: true
		}
	});

	return rows.map((v) => ({
		visitId: v.id,
		visitNo: v.visitNo,
		visitedAt: v.createdAt,
		branchName: v.branch?.name ?? null,
		visitTypeName: v.visitType?.name ?? null,
		statusName: v.status?.name ?? null,
		doctorName: doctorDisplayName(v.doctor)
	}));
}

export async function getPatientVisitDetail(
	ctx: PatientPortalContext,
	visitId: string
) {
	const visit = await ensureDb().query.patientVisitTable.findFirst({
		where: and(
			eq(table.patientVisitTable.id, visitId),
			eq(table.patientVisitTable.patientId, ctx.patientId),
			eq(table.patientVisitTable.hospitalId, ctx.hospitalId),
			ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
		),
		with: {
			branch: true,
			visitType: true,
			doctor: { with: { title: true } },
			status: true,
			classificationDiagnoses: { with: { diagnosisType: true } }
		}
	});

	if (!visit) return null;

	const [
		vitals,
		allergies,
		medications,
		labResults,
		serviceOrders,
		carePlan,
		progressNotes,
		prescriptionNotes,
		formEntries,
		documents
	] = await Promise.all([
		listPatientVitals(ctx, { visitId, limit: 50 }),
		listPatientAllergies(ctx, { limit: 50 }),
		listPatientMedications(ctx, { visitId, limit: 50 }),
		listReleasedResultsForVisit({
			hospitalId: ctx.hospitalId,
			visitId
		}),
		listVisitServiceOrders(visitId),
		listVisitCarePlan(ctx, visitId),
		listVisitProgressNotes(ctx, visitId),
		listVisitPrescriptionNotes(ctx, visitId),
		listVisitFormEntries(ctx, visitId),
		listVisitDocuments(ctx, visitId)
	]);

	const chiefComplaints = distinctTexts([
		visit.chiefComplaint,
		...formEntries
			.filter((entry) => entry.formCode === 'chief_complaint')
			.map((entry) => entry.description)
	]);
	const patientConditions = distinctTexts([
		visit.patientCondition,
		...formEntries
			.filter((entry) => entry.formCode === 'patient_condition')
			.map((entry) => entry.description)
	]);
	const visitFormEntries = formEntries.filter(
		(entry) =>
			entry.formCode !== 'chief_complaint' &&
			entry.formCode !== 'patient_condition'
	);

	return {
		visitId: visit.id,
		visitNo: visit.visitNo,
		visitedAt: visit.createdAt,
		updatedAt: visit.updatedAt,
		branchName: visit.branch?.name ?? null,
		visitTypeName: visit.visitType?.name ?? null,
		statusName: visit.status?.name ?? null,
		doctorName: doctorDisplayName(visit.doctor),
		chiefComplaint: chiefComplaints[0] ?? null,
		chiefComplaints,
		patientCondition: patientConditions[0] ?? null,
		patientConditions,
		diagnosisNotes: text(visit.diagnosisNotes),
		clinicalSignedAt: visit.clinicalSignedAt,
		diagnoses: visit.classificationDiagnoses
			.filter((d) => d.statusId !== StatusEnum.DELETED)
			.map((d) => ({
				description: text(d.description),
				typeName: d.diagnosisType?.name ?? null
			})),
		vitals,
		allergies,
		medications,
		labResults,
		serviceOrders,
		carePlan,
		progressNotes,
		prescriptionNotes,
		formEntries: visitFormEntries,
		documents
	};
}

async function listVisitServiceOrders(visitId: string) {
	const orders = await ensureDb().query.serviceOrderTable.findMany({
		where: and(
			eq(table.serviceOrderTable.visitId, visitId),
			ne(table.serviceOrderTable.statusId, StatusEnum.DELETED)
		),
		orderBy: [desc(table.serviceOrderTable.createdAt)],
		with: {
			details: {
				with: {
					serviceItem: true,
					status: true
				}
			}
		}
	});

	return orders
		.map((order) => ({
			orderNo: order.orderNo,
			orderDate: order.orderDate,
			orderTime: order.orderTime,
			items: order.details
				.filter((detail) => detail.statusId !== StatusEnum.DELETED)
				.map((detail) => ({
					serviceName: detail.serviceItem?.serviceName ?? null,
					instruction: text(detail.instruction),
					isUrgent: detail.isUrgent,
					statusName: detail.status?.name ?? null,
					completedAt: detail.nursingCompleteTime
				}))
		}))
		.filter((order) => order.items.length > 0);
}

async function listVisitCarePlan(
	ctx: PatientPortalContext,
	visitId: string
) {
	const rows = await ensureDb().query.planOfCareTable.findMany({
		where: and(
			eq(table.planOfCareTable.visitId, visitId),
			eq(table.planOfCareTable.patientId, ctx.patientId),
			ne(table.planOfCareTable.statusId, StatusEnum.DELETED)
		),
		orderBy: [
			asc(table.planOfCareTable.sequenceNo),
			asc(table.planOfCareTable.createdAt)
		],
		with: { doctor: { with: { title: true } } }
	});

	return rows
		.map((row) => ({
			note: text(row.note),
			doctorName: doctorDisplayName(row.doctor),
			createdAt: row.createdAt
		}))
		.filter((row) => row.note);
}

async function listVisitProgressNotes(
	ctx: PatientPortalContext,
	visitId: string
) {
	const rows = await ensureDb().query.progressNoteTable.findMany({
		where: and(
			eq(table.progressNoteTable.visitId, visitId),
			eq(table.progressNoteTable.patientId, ctx.patientId),
			ne(table.progressNoteTable.statusId, StatusEnum.DELETED),
			or(
				isNotNull(table.progressNoteTable.signedAt),
				isNotNull(table.progressNoteTable.cosignedAt)
			)
		),
		orderBy: [
			asc(table.progressNoteTable.sequenceNo),
			asc(table.progressNoteTable.createdAt)
		],
		with: { doctor: { with: { title: true } } }
	});

	return rows.map((row) => ({
		note: text(row.note),
		subjective: text(row.subjective),
		objective: text(row.objective),
		assessment: text(row.assessment),
		plan: text(row.plan),
		doctorName: doctorDisplayName(row.doctor),
		signedAt: row.signedAt,
		cosignedAt: row.cosignedAt,
		createdAt: row.createdAt
	}));
}

async function listVisitPrescriptionNotes(
	ctx: PatientPortalContext,
	visitId: string
) {
	const rows = await ensureDb().query.cpoePrescriptionNoteTable.findMany({
		where: and(
			eq(table.cpoePrescriptionNoteTable.visitId, visitId),
			eq(table.cpoePrescriptionNoteTable.patientId, ctx.patientId),
			ne(table.cpoePrescriptionNoteTable.statusId, StatusEnum.DELETED)
		),
		orderBy: [
			asc(table.cpoePrescriptionNoteTable.sequenceNo),
			asc(table.cpoePrescriptionNoteTable.createdAt)
		],
		with: { doctor: { with: { title: true } } }
	});

	return rows
		.map((row) => ({
			note: text(row.note),
			doctorName: doctorDisplayName(row.doctor),
			createdAt: row.createdAt
		}))
		.filter((row) => row.note);
}

async function listVisitFormEntries(
	ctx: PatientPortalContext,
	visitId: string
) {
	const rows = await ensureDb().query.patientFormEntryTable.findMany({
		where: and(
			eq(table.patientFormEntryTable.visitId, visitId),
			eq(table.patientFormEntryTable.patientId, ctx.patientId),
			ne(table.patientFormEntryTable.statusId, StatusEnum.DELETED)
		),
		orderBy: [desc(table.patientFormEntryTable.createdAt)],
		with: { formName: true }
	});

	return rows
		.filter((row) => row.statusId === StatusEnum.ACTIVE)
		.map((row) => ({
			formName: row.formName?.name ?? row.formName?.code ?? null,
			formCode: row.formName?.code ?? null,
			description: text(row.description),
			createdAt: row.createdAt
		}));
}

async function listVisitDocuments(
	ctx: PatientPortalContext,
	visitId: string
) {
	const rows = await ensureDb().query.patientDocumentTable.findMany({
		where: and(
			eq(table.patientDocumentTable.visitId, visitId),
			eq(table.patientDocumentTable.patientId, ctx.patientId),
			ne(table.patientDocumentTable.statusId, StatusEnum.DELETED)
		),
		orderBy: [desc(table.patientDocumentTable.createdAt)],
		with: {
			document: true,
			patientAttachment: true
		}
	});

	return rows.flatMap((row) => {
		const attachment = row.patientAttachment;
		if (
			!attachment ||
			attachment.patientId !== ctx.patientId ||
			attachment.statusId === StatusEnum.DELETED
		) {
			return [];
		}
		const storageKey = patientAttachmentStorageKey(attachment.fileUrl);
		if (!storageKey) return [];
		return [
			{
				id: attachment.id,
				description:
					attachment.description ??
					row.document?.code ??
					row.document?.documentNumber ??
					null,
				createdAt: row.createdAt,
				contentType: contentTypeFromStorageKey(storageKey),
				contentUrl: `${PATIENT_DOCUMENT_CONTENT_PREFIX}/${attachment.id}/content`
			}
		];
	});
}
