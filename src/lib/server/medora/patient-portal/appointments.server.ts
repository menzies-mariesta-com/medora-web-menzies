import { and, desc, eq, gte, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PatientPortalContext } from './require-patient-context.server';

export async function listPatientAppointments(ctx: PatientPortalContext) {
	return ensureDb().query.appointmentTable.findMany({
		where: and(
			eq(table.appointmentTable.hospitalId, ctx.hospitalId),
			eq(table.appointmentTable.patientId, ctx.patientId),
			ne(table.appointmentTable.statusId, StatusEnum.DELETED)
		),
		orderBy: [
			desc(table.appointmentTable.appointmentDate),
			desc(table.appointmentTable.fromTime)
		],
		with: {
			staff: { with: { title: true } },
			branch: true,
			statusTagging: true
		}
	});
}

export async function bookPatientAppointment(
	ctx: PatientPortalContext,
	input: {
		branchId: string;
		staffId: string;
		appointmentDate: string;
		fromTime: string;
		toTime: string;
		remark?: string;
	}
) {
	const [row] = await ensureDb()
		.insert(table.appointmentTable)
		.values({
			hospitalId: ctx.hospitalId,
			branchId: input.branchId,
			patientId: ctx.patientId,
			staffId: input.staffId,
			appointmentDate: input.appointmentDate,
			fromTime: input.fromTime,
			toTime: input.toTime,
			remark: input.remark,
			patientName: [
				ctx.patient.firstName,
				ctx.patient.middleName,
				ctx.patient.lastName
			]
				.filter(Boolean)
				.join(' '),
			statusId: StatusEnum.ACTIVE
		})
		.returning();
	return row;
}

export async function cancelPatientAppointment(
	ctx: PatientPortalContext,
	input: { appointmentId: number; cancelRemark: string }
) {
	const [row] = await ensureDb()
		.update(table.appointmentTable)
		.set({
			cancelRemark: input.cancelRemark,
			statusId: StatusEnum.INACTIVE
		})
		.where(
			and(
				eq(table.appointmentTable.id, input.appointmentId),
				eq(table.appointmentTable.patientId, ctx.patientId),
				eq(table.appointmentTable.hospitalId, ctx.hospitalId)
			)
		)
		.returning();
	return row ?? null;
}

export async function listUpcomingPatientAppointments(
	ctx: PatientPortalContext,
	fromDate: string
) {
	return ensureDb().query.appointmentTable.findMany({
		where: and(
			eq(table.appointmentTable.hospitalId, ctx.hospitalId),
			eq(table.appointmentTable.patientId, ctx.patientId),
			ne(table.appointmentTable.statusId, StatusEnum.DELETED),
			gte(table.appointmentTable.appointmentDate, fromDate)
		),
		orderBy: [
			table.appointmentTable.appointmentDate,
			table.appointmentTable.fromTime
		],
		with: {
			staff: { with: { title: true } },
			branch: true,
			statusTagging: true
		}
	});
}
