import { and, asc, desc, eq, gte, lt, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PatientPortalContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import {
	listPatientAllergies,
	listPatientMedications,
	listPatientVitals
} from '$lib/server/medora/patient-portal/clinical.server';
import {
	contentTypeFromStorageKey,
	patientAttachmentStorageKey
} from '$lib/server/medora/patient-portal/documents.server';
import type { DoctorPortalContext } from './doctor-context.server';
import { doctorDisplayName } from './doctor-context.server';
import { listDoctorLabResults } from './doctor-results.server';
import {
	dayEndIso,
	dayStartIso,
	distinctTexts,
	patientDisplayName,
	safeLimit,
	text,
	todayIso
} from './doctor-utils.server';

export type DoctorVisitListOptions = {
	from?: string;
	to?: string;
	patientId?: string;
	limit?: number;
	/** Default true: only visits assigned to this doctor. */
	mineOnly?: boolean;
};

function clinicalContext(
	ctx: DoctorPortalContext,
	patientId: string
): PatientPortalContext {
	return {
		userId: ctx.userId,
		patientId,
		hospitalId: ctx.hospitalId
	} as PatientPortalContext;
}

export async function listDoctorVisits(
	ctx: DoctorPortalContext,
	options: DoctorVisitListOptions = {}
) {
	const mineOnly = options.mineOnly ?? true;
	const from = options.from?.trim();
	const to = options.to?.trim() || (from ? from : todayIso());
	const datedFrom =
		from || (options.patientId ? undefined : todayIso());
	const rows = await ensureDb().query.patientVisitTable.findMany({
		where: and(
			eq(table.patientVisitTable.hospitalId, ctx.hospitalId),
			ne(table.patientVisitTable.statusId, StatusEnum.DELETED),
			mineOnly
				? eq(table.patientVisitTable.doctorId, ctx.staffId)
				: undefined,
			options.patientId
				? eq(table.patientVisitTable.patientId, options.patientId)
				: undefined,
			ctx.branchId
				? eq(table.patientVisitTable.branchId, ctx.branchId)
				: undefined,
			datedFrom
				? gte(
						table.patientVisitTable.createdAt,
						dayStartIso(datedFrom)
					)
				: undefined,
			from || to
				? lt(table.patientVisitTable.createdAt, dayEndIso(to))
				: undefined
		),
		orderBy: [desc(table.patientVisitTable.createdAt)],
		limit: safeLimit(options.limit),
		with: {
			patient: { with: { title: true, gender: true } },
			branch: true,
			visitType: true,
			status: true,
			doctor: { with: { title: true } }
		}
	});

	return rows.map((visit) => ({
		visitId: visit.id,
		visitNo: visit.visitNo,
		visitedAt: visit.createdAt,
		updatedAt: visit.updatedAt,
		branchName: visit.branch?.name ?? null,
		visitTypeName: visit.visitType?.name ?? null,
		statusName: visit.status?.name ?? null,
		doctorName: doctorDisplayName(visit.doctor),
		patientId: visit.patientId,
		patientCode: visit.patient?.code ?? null,
		patientName:
			patientDisplayName(visit.patient) ??
			visit.patient?.code ??
			null,
		chiefComplaint: text(visit.chiefComplaint),
		patientCondition: text(visit.patientCondition),
		clinicalSignedAt: visit.clinicalSignedAt
	}));
}

export async function getDoctorVisitDetail(
	ctx: DoctorPortalContext,
	visitId: string
) {
	const visit = await ensureDb().query.patientVisitTable.findFirst({
		where: and(
			eq(table.patientVisitTable.id, visitId),
			eq(table.patientVisitTable.hospitalId, ctx.hospitalId),
			ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
		),
		with: {
			patient: {
				with: {
					title: true,
					gender: true,
					bloodType: true,
					user: true
				}
			},
			branch: true,
			visitType: true,
			doctor: { with: { title: true } },
			status: true,
			classificationDiagnoses: { with: { diagnosisType: true } }
		}
	});
	if (!visit) return null;

	const clinical = clinicalContext(ctx, visit.patientId);
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
		listPatientVitals(clinical, { visitId, limit: 50 }),
		listPatientAllergies(clinical, { limit: 50 }),
		listPatientMedications(clinical, { visitId, limit: 50 }),
		listDoctorLabResults(ctx, {
			visitId,
			limit: 50,
			mineOnly: false
		}),
		listVisitServiceOrders(visitId),
		listVisitCarePlan(clinical, visitId),
		listVisitProgressNotes(clinical, visitId),
		listVisitPrescriptionNotes(clinical, visitId),
		listVisitFormEntries(clinical, visitId),
		listVisitDocuments(clinical, visitId)
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
		patientId: visit.patientId,
		patientCode: visit.patient?.code ?? null,
		patientName:
			patientDisplayName(visit.patient) ??
			visit.patient?.code ??
			null,
		patientDateOfBirth: visit.patient?.dateOfBirth ?? null,
		patientGender: visit.patient?.gender?.name ?? null,
		patientBloodType: visit.patient?.bloodType?.name ?? null,
		patientPhone: visit.patient?.phonePrimary ?? null,
		patientEmail: visit.patient?.user?.email ?? null,
		chiefComplaint: chiefComplaints[0] ?? null,
		chiefComplaints,
		patientCondition: patientConditions[0] ?? null,
		patientConditions,
		diagnosisNotes: text(visit.diagnosisNotes),
		clinicalSignedAt: visit.clinicalSignedAt,
		diagnoses: visit.classificationDiagnoses
			.filter(
				(diagnosis) => diagnosis.statusId !== StatusEnum.DELETED
			)
			.map((diagnosis) => ({
				description: text(diagnosis.description),
				typeName: diagnosis.diagnosisType?.name ?? null
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
			ne(table.progressNoteTable.statusId, StatusEnum.DELETED)
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
	const rows =
		await ensureDb().query.cpoePrescriptionNoteTable.findMany({
			where: and(
				eq(table.cpoePrescriptionNoteTable.visitId, visitId),
				eq(table.cpoePrescriptionNoteTable.patientId, ctx.patientId),
				ne(
					table.cpoePrescriptionNoteTable.statusId,
					StatusEnum.DELETED
				)
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
		const storageKey = patientAttachmentStorageKey(
			attachment.fileUrl
		);
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
				contentUrl: `/api/doctor/v1/documents/${attachment.id}/content`
			}
		];
	});
}
