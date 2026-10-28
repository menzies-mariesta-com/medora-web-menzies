import {
	and,
	count,
	desc,
	eq,
	ilike,
	inArray,
	ne,
	or
} from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PatientPortalContext } from '$lib/server/medora/patient-portal/require-patient-context.server';
import { buildPatientHealth } from '$lib/server/medora/patient-portal/health.server';
import { listPatientVisits } from '$lib/server/medora/patient-portal/visits.server';
import type { DoctorPortalContext } from './doctor-context.server';
import { listDoctorLabResults } from './doctor-results.server';
import {
	ageLabel,
	patientDisplayName,
	safeLimit,
	safeOffset,
	text
} from './doctor-utils.server';

/** Clinical helpers only read these fields; the patient portal context is
 * otherwise about the signed-in patient. */
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

export type DoctorPatientListOptions = {
	search?: string;
	limit?: number;
	offset?: number;
};

export async function listDoctorPatients(
	ctx: DoctorPortalContext,
	options: DoctorPatientListOptions = {}
) {
	const search = options.search?.trim();
	const pattern = search ? `%${search}%` : null;
	const rows = await ensureDb().query.patientTable.findMany({
		where: and(
			eq(table.patientTable.hospitalId, ctx.hospitalId),
			ne(table.patientTable.statusId, StatusEnum.DELETED),
			pattern
				? or(
						ilike(table.patientTable.firstName, pattern),
						ilike(table.patientTable.middleName, pattern),
						ilike(table.patientTable.lastName, pattern),
						ilike(table.patientTable.code, pattern),
						ilike(table.patientTable.phonePrimary, pattern),
						ilike(table.patientTable.identityNo, pattern)
					)
				: undefined
		),
		orderBy: [desc(table.patientTable.updatedAt)],
		limit: safeLimit(options.limit),
		offset: safeOffset(options.offset),
		with: {
			title: true,
			gender: true,
			bloodType: true,
			user: true
		}
	});

	const ids = rows.map((row) => row.id);
	if (ids.length === 0) return [];

	const [visits, allergyCounts] = await Promise.all([
		ensureDb().query.patientVisitTable.findMany({
			where: and(
				inArray(table.patientVisitTable.patientId, ids),
				eq(table.patientVisitTable.hospitalId, ctx.hospitalId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			),
			orderBy: [desc(table.patientVisitTable.createdAt)],
			limit: Math.max(ids.length * 8, 50),
			with: {
				doctor: { with: { title: true } },
				status: true
			}
		}),
		ensureDb()
			.select({
				patientId: table.patientAllergyTable.patientId,
				total: count()
			})
			.from(table.patientAllergyTable)
			.where(
				and(
					inArray(table.patientAllergyTable.patientId, ids),
					eq(table.patientAllergyTable.statusId, StatusEnum.ACTIVE)
				)
			)
			.groupBy(table.patientAllergyTable.patientId)
	]);

	const latestVisitByPatient = new Map<
		string,
		(typeof visits)[number]
	>();
	for (const visit of visits) {
		if (!latestVisitByPatient.has(visit.patientId)) {
			latestVisitByPatient.set(visit.patientId, visit);
		}
	}
	const allergyByPatient = new Map(
		allergyCounts.map((row) => [row.patientId, Number(row.total)])
	);

	return rows.map((row) => {
		const visit = latestVisitByPatient.get(row.id);
		return {
			patientId: row.id,
			patientCode: row.code,
			displayName:
				patientDisplayName(row) ?? text(row.code) ?? 'Patient',
			dateOfBirth: row.dateOfBirth,
			age: ageLabel({ dateOfBirth: row.dateOfBirth }),
			gender: row.gender?.name ?? null,
			bloodType: row.bloodType?.name ?? null,
			phonePrimary: row.phonePrimary,
			email: row.user?.email ?? null,
			lastVisitAt: visit?.createdAt ?? null,
			lastVisitNo: visit?.visitNo ?? null,
			lastVisitStatus: visit?.status?.name ?? null,
			lastVisitDoctorName: visit?.doctor
				? patientDisplayName(visit.doctor)
				: null,
			activeAllergies: allergyByPatient.get(row.id) ?? 0
		};
	});
}

export async function getDoctorPatient(
	ctx: DoctorPortalContext,
	patientId: string
) {
	const patient = await ensureDb().query.patientTable.findFirst({
		where: and(
			eq(table.patientTable.id, patientId),
			eq(table.patientTable.hospitalId, ctx.hospitalId),
			ne(table.patientTable.statusId, StatusEnum.DELETED)
		),
		with: {
			title: true,
			gender: true,
			bloodType: true,
			maritalStatus: true,
			city: true,
			state: true,
			country: true,
			user: true,
			hospital: true
		}
	});
	if (!patient) return null;

	const clinical = clinicalContext(ctx, patientId);
	const [health, visits, results] = await Promise.all([
		buildPatientHealth(clinical),
		listPatientVisits(clinical),
		listDoctorLabResults(ctx, {
			patientId,
			limit: 20,
			mineOnly: false
		})
	]);

	return {
		patient: {
			patientId: patient.id,
			patientCode: patient.code,
			displayName:
				patientDisplayName(patient) ??
				text(patient.code) ??
				'Patient',
			dateOfBirth: patient.dateOfBirth,
			age: ageLabel({ dateOfBirth: patient.dateOfBirth }),
			gender: patient.gender?.name ?? null,
			maritalStatus: patient.maritalStatus?.name ?? null,
			bloodType: patient.bloodType?.name ?? null,
			phonePrimary: patient.phonePrimary,
			phoneSecondary: patient.phoneSecondary,
			email: patient.user?.email ?? null,
			address: patient.address,
			identityNo: patient.identityNo,
			city: patient.city?.name ?? null,
			state: patient.state?.name ?? null,
			country: patient.country?.name ?? null,
			hospitalId: patient.hospitalId,
			hospitalName: patient.hospital?.name ?? null
		},
		health,
		visits,
		recentResults: results
	};
}
