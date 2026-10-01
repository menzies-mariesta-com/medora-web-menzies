import { and, eq, ne } from 'drizzle-orm';
import { IpdAdmissionStatusEnum, StatusEnum } from '$lib/model/enum/db-link';
import type { AdtBedStatusRow } from '$lib/model/type/medora/adt/adt.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listBedsForAdtStatus(input: {
	hospitalId: string;
	wardId?: number;
	bedStatus?: number;
}): Promise<AdtBedStatusRow[]> {
	const db = ensureDb();
	const conditions = [
		eq(table.bedTable.hospitalId, input.hospitalId),
		ne(table.bedTable.statusId, StatusEnum.DELETED)
	];
	if (typeof input.wardId === 'number') {
		conditions.push(eq(table.wardTable.id, input.wardId));
	}
	if (typeof input.bedStatus === 'number') {
		conditions.push(eq(table.bedTable.bedStatus, input.bedStatus));
	}

	const beds = await db
		.select({
			id: table.bedTable.id,
			name: table.bedTable.name,
			code: table.bedTable.code,
			bedStatus: table.bedTable.bedStatus,
			roomId: table.bedTable.roomId,
			roomName: table.roomTable.name,
			wardId: table.wardTable.id,
			wardName: table.wardTable.name
		})
		.from(table.bedTable)
		.innerJoin(
			table.roomTable,
			eq(table.bedTable.roomId, table.roomTable.id)
		)
		.innerJoin(
			table.wardTable,
			eq(table.roomTable.wardId, table.wardTable.id)
		)
		.where(and(...conditions))
		.orderBy(table.wardTable.name, table.roomTable.name, table.bedTable.name);

	const bedIds = beds.map((b) => b.id);
	const admissionByBed = new Map<
		number,
		{ admissionId: number; visitId: number; patientName: string | null }
	>();

	if (bedIds.length > 0) {
		const admissions = await db
			.select({
				admissionId: table.ipdAdmissionTable.id,
				visitId: table.ipdAdmissionTable.visitId,
				bedId: table.ipdAdmissionTable.bedId,
				patientName: table.patientTable.firstName
			})
			.from(table.ipdAdmissionTable)
			.innerJoin(
				table.patientVisitTable,
				eq(table.ipdAdmissionTable.visitId, table.patientVisitTable.id)
			)
			.leftJoin(
				table.patientTable,
				eq(table.patientVisitTable.patientId, table.patientTable.id)
			)
			.where(
				and(
					eq(table.ipdAdmissionTable.hospitalId, input.hospitalId),
					eq(
						table.ipdAdmissionTable.admissionStatus,
						IpdAdmissionStatusEnum.ADMITTED
					),
					ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED)
				)
			);

		for (const a of admissions) {
			const fullName = a.patientName;
			admissionByBed.set(a.bedId, {
				admissionId: a.admissionId,
				visitId: a.visitId,
				patientName: fullName
			});
		}
	}

	return beds.map((b) => {
		const adm = admissionByBed.get(b.id);
		return {
			id: b.id,
			name: b.name,
			code: b.code,
			bedStatus: b.bedStatus,
			wardId: b.wardId,
			wardName: b.wardName,
			roomId: b.roomId,
			roomName: b.roomName,
			admissionId: adm?.admissionId ?? null,
			visitId: adm?.visitId ?? null,
			patientName: adm?.patientName ?? null
		};
	});
}
