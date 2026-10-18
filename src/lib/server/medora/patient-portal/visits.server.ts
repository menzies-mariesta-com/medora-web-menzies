import { and, desc, eq, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PatientPortalContext } from './require-patient-context.server';
import { writePatientPortalAudit } from './audit.server';

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

export async function listPatientVisits(
	ctx: PatientPortalContext,
	endpoint: string
) {
	await writePatientPortalAudit({
		userId: ctx.userId,
		patientId: ctx.patientId,
		hospitalId: ctx.hospitalId,
		endpoint
	});

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
