import { and, desc, eq, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PatientPortalContext } from './require-patient-context.server';

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

	return {
		visitId: visit.id,
		visitNo: visit.visitNo,
		visitedAt: visit.createdAt,
		updatedAt: visit.updatedAt,
		branchName: visit.branch?.name ?? null,
		visitTypeName: visit.visitType?.name ?? null,
		statusName: visit.status?.name ?? null,
		doctorName: doctorDisplayName(visit.doctor),
		chiefComplaint: visit.chiefComplaint,
		patientCondition: visit.patientCondition,
		diagnosisNotes: visit.diagnosisNotes,
		clinicalSignedAt: visit.clinicalSignedAt,
		diagnoses: visit.classificationDiagnoses
			.filter((d) => d.statusId !== StatusEnum.DELETED)
			.map((d) => ({
				description: d.description,
				typeName: d.diagnosisType?.name ?? null
			}))
	};
}
