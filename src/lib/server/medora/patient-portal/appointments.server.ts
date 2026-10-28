import { and, desc, eq, gte, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PatientPortalContext } from './require-patient-context.server';

function doctorName(
	staff: {
		firstName?: string | null;
		middleName?: string | null;
		lastName?: string | null;
		title?: { name?: string | null } | null;
	} | null
): string | null {
	if (!staff) return null;
	const name = [
		staff.title?.name,
		staff.firstName,
		staff.middleName,
		staff.lastName
	]
		.filter(Boolean)
		.join(' ')
		.trim();
	return name || null;
}

function mapAppointment(row: {
	id: number;
	appointmentDate: string | null;
	fromTime: string | null;
	toTime: string | null;
	remark: string | null;
	cancelRemark: string | null;
	staff?: Parameters<typeof doctorName>[0];
	branch?: { name: string | null } | null;
	statusTagging?: { name: string | null } | null;
}) {
	return {
		appointmentId: row.id,
		appointmentDate: row.appointmentDate,
		fromTime: row.fromTime,
		toTime: row.toTime,
		remark: row.remark,
		cancelRemark: row.cancelRemark,
		doctorName: doctorName(row.staff ?? null),
		branchName: row.branch?.name ?? null,
		statusName: row.statusTagging?.name ?? null
	};
}

export async function listPatientAppointments(
	ctx: PatientPortalContext
) {
	const rows = await ensureDb().query.appointmentTable.findMany({
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
	return rows.map(mapAppointment);
}

export async function listUpcomingPatientAppointments(
	ctx: PatientPortalContext,
	fromDate: string
) {
	const rows = await ensureDb().query.appointmentTable.findMany({
		where: and(
			eq(table.appointmentTable.hospitalId, ctx.hospitalId),
			eq(table.appointmentTable.patientId, ctx.patientId),
			ne(table.appointmentTable.statusId, StatusEnum.DELETED),
			eq(table.appointmentTable.statusId, StatusEnum.ACTIVE),
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
	return rows.map(mapAppointment);
}
