import { and, desc, eq, ne } from 'drizzle-orm';
import {
	IpdAdmissionStatusEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import type { ConsultationWorkspaceRow } from '$lib/model/type/medora/clinical.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { isMo } from './clinical-authority.server';

export async function listConsultationWorkspace(input: {
	hospitalId: string;
	staffId: string;
	staffTypeId: number;
}): Promise<ConsultationWorkspaceRow[]> {
	const conditions = [
		eq(table.ipdAdmissionTable.hospitalId, input.hospitalId),
		eq(
			table.ipdAdmissionTable.admissionStatus,
			IpdAdmissionStatusEnum.ADMITTED
		),
		ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED)
	];
	if (isMo(input.staffTypeId)) {
		conditions.push(
			eq(table.ipdAdmissionTable.admittingDoctorId, input.staffId)
		);
	}
	const rows = await ensureDb()
		.select({
			admissionId: table.ipdAdmissionTable.id,
			visitId: table.ipdAdmissionTable.visitId,
			visitNo: table.patientVisitTable.visitNo,
			patientId: table.patientTable.id,
			firstName: table.patientTable.firstName,
			middleName: table.patientTable.middleName,
			lastName: table.patientTable.lastName,
			admissionNo: table.ipdAdmissionTable.admissionNo,
			wardName: table.wardTable.name,
			bedName: table.bedTable.name,
			admittedAt: table.ipdAdmissionTable.admittedAt,
			admittingDoctorId: table.ipdAdmissionTable.admittingDoctorId
		})
		.from(table.ipdAdmissionTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.ipdAdmissionTable.visitId, table.patientVisitTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.leftJoin(
			table.wardTable,
			eq(table.ipdAdmissionTable.wardId, table.wardTable.id)
		)
		.leftJoin(
			table.bedTable,
			eq(table.ipdAdmissionTable.bedId, table.bedTable.id)
		)
		.where(and(...conditions))
		.orderBy(desc(table.ipdAdmissionTable.admittedAt));
	return rows.map((row) => ({
		admissionId: row.admissionId,
		visitId: row.visitId,
		visitNo: row.visitNo,
		patientId: row.patientId,
		patientName: [row.firstName, row.middleName, row.lastName]
			.filter(Boolean)
			.join(' '),
		admissionNo: row.admissionNo ?? `Admission #${row.admissionId}`,
		wardName: row.wardName,
		bedName: row.bedName,
		admittedAt: String(row.admittedAt ?? '') || null,
		admittingDoctorId: row.admittingDoctorId
	}));
}
