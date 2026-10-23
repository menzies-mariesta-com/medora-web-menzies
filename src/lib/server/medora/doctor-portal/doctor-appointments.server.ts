import { and, asc, desc, eq, gte, lte, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { DoctorPortalContext } from './doctor-context.server';
import {
	addDaysIso,
	ageLabel,
	patientDisplayName,
	safeLimit,
	text,
	todayIso
} from './doctor-utils.server';

export type DoctorAppointmentListOptions = {
	from?: string;
	to?: string;
	limit?: number;
	branchId?: string | null;
};

function appointmentConditions(
	ctx: DoctorPortalContext,
	options: DoctorAppointmentListOptions
) {
	const from = options.from?.trim() || todayIso();
	const to = options.to?.trim() || addDaysIso(from, 14);
	const branchId = options.branchId ?? ctx.branchId;
	return and(
		eq(table.appointmentTable.hospitalId, ctx.hospitalId),
		eq(table.appointmentTable.staffId, ctx.staffId),
		ne(table.appointmentTable.statusId, StatusEnum.DELETED),
		gte(table.appointmentTable.appointmentDate, from),
		lte(table.appointmentTable.appointmentDate, to),
		branchId
			? eq(table.appointmentTable.branchId, branchId)
			: undefined
	);
}

type AppointmentRelationRow =
	typeof table.appointmentTable.$inferSelect & {
		branch?: { name: string | null } | null;
		patient?:
			| (typeof table.patientTable.$inferSelect & {
					title?: { name: string | null } | null;
					gender?: { name: string | null } | null;
					bloodType?: { name: string | null } | null;
					user?: { email: string | null } | null;
			  })
			| null;
		status?: { name: string | null } | null;
		statusTagging?: { name: string | null } | null;
	};

function mapAppointment(row: AppointmentRelationRow) {
	const patient = row.patient;
	return {
		appointmentId: row.id,
		appointmentDate: row.appointmentDate,
		fromTime: row.fromTime,
		toTime: row.toTime,
		statusName: row.status?.name ?? null,
		statusTaggingName: row.statusTagging?.name ?? null,
		branchName: row.branch?.name ?? null,
		remark: text(row.remark),
		cancelRemark: text(row.cancelRemark),
		patientId: row.patientId ?? patient?.id ?? null,
		patientName:
			patientDisplayName(patient) ?? text(row.patientName) ?? null,
		patientCode: patient?.code ?? null,
		patientPhone: patient?.phonePrimary ?? text(row.appointmentPhone),
		patientGender: patient?.gender?.name ?? null,
		patientDateOfBirth:
			patient?.dateOfBirth ?? row.patientDateOfBirth ?? null,
		patientAge: ageLabel({
			dateOfBirth: patient?.dateOfBirth ?? row.patientDateOfBirth,
			ageYear: row.patientAgeYear,
			ageMonth: row.patientAgeMonth,
			ageDay: row.patientAgeDay
		})
	};
}

export async function listDoctorAppointments(
	ctx: DoctorPortalContext,
	options: DoctorAppointmentListOptions = {}
) {
	const branchId = options.branchId ?? ctx.branchId;
	const rows = await ensureDb().query.appointmentTable.findMany({
		where: appointmentConditions(ctx, { ...options, branchId }),
		orderBy: [
			asc(table.appointmentTable.appointmentDate),
			asc(table.appointmentTable.fromTime)
		],
		limit: safeLimit(options.limit),
		with: {
			branch: true,
			patient: { with: { title: true, gender: true } },
			status: true,
			statusTagging: true
		}
	});
	return rows.map(mapAppointment);
}

export async function listDoctorTodayAppointments(
	ctx: DoctorPortalContext
) {
	const today = todayIso();
	return listDoctorAppointments(ctx, {
		from: today,
		to: today,
		limit: 100
	});
}

export async function getDoctorAppointment(
	ctx: DoctorPortalContext,
	appointmentId: number
) {
	const branchId = ctx.branchId;
	const appointment =
		await ensureDb().query.appointmentTable.findFirst({
			where: and(
				eq(table.appointmentTable.id, appointmentId),
				eq(table.appointmentTable.hospitalId, ctx.hospitalId),
				eq(table.appointmentTable.staffId, ctx.staffId),
				ne(table.appointmentTable.statusId, StatusEnum.DELETED),
				branchId
					? eq(table.appointmentTable.branchId, branchId)
					: undefined
			),
			with: {
				branch: true,
				patient: {
					with: {
						title: true,
						gender: true,
						bloodType: true,
						user: true
					}
				},
				status: true,
				statusTagging: true
			}
		});
	if (!appointment) return null;

	const visit = await ensureDb()
		.select({
			id: table.patientVisitTable.id,
			visitNo: table.patientVisitTable.visitNo,
			createdAt: table.patientVisitTable.createdAt
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.appointmentId, appointment.id),
				eq(table.patientVisitTable.hospitalId, ctx.hospitalId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(desc(table.patientVisitTable.createdAt))
		.limit(1);

	return {
		...mapAppointment(appointment),
		patientEmail: appointment.patient?.user?.email ?? null,
		patientAddress: appointment.patient?.address ?? null,
		patientBloodType: appointment.patient?.bloodType?.name ?? null,
		visitId: visit[0]?.id ?? null,
		visitNo: visit[0]?.visitNo ?? null,
		visitedAt: visit[0]?.createdAt ?? null
	};
}
