import { and, eq, ilike, inArray, ne, sql } from 'drizzle-orm';
import { IpdAdmissionStatusEnum, StatusEnum } from '$lib/model/enum/db-link';
import type { AdtBedStatusRow } from '$lib/model/type/medora/adt/adt.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { patientDisplayName } from '$lib/server/medora/doctor-portal/doctor-utils.server';

export async function listBedsForAdtStatus(input: {
	hospitalId: string;
	wardId?: number;
	bedStatus?: number;
	patientName?: string;
	visitName?: string;
	bedName?: string;
	roomName?: string;
}): Promise<AdtBedStatusRow[]> {
	const db = ensureDb();
	const patientName = input.patientName?.trim();
	const visitName = input.visitName?.trim();
	const bedName = input.bedName?.trim();
	const roomName = input.roomName?.trim();
	const conditions = [
		eq(table.bedTable.hospitalId, input.hospitalId),
		eq(table.bedTable.isEr, false),
		ne(table.bedTable.statusId, StatusEnum.DELETED)
	];
	if (typeof input.wardId === 'number') {
		conditions.push(eq(table.wardTable.id, input.wardId));
	}
	if (typeof input.bedStatus === 'number') {
		conditions.push(eq(table.bedTable.bedStatus, input.bedStatus));
	}
	if (bedName) {
		conditions.push(ilike(table.bedTable.name, `%${bedName}%`));
	}
	if (roomName) {
		conditions.push(ilike(table.roomTable.name, `%${roomName}%`));
	}
	if (patientName || visitName) {
		const admissionMatch = [
			eq(table.ipdAdmissionTable.hospitalId, input.hospitalId),
			eq(
				table.ipdAdmissionTable.admissionStatus,
				IpdAdmissionStatusEnum.ADMITTED
			),
			ne(table.ipdAdmissionTable.statusId, StatusEnum.DELETED)
		];
		if (patientName) {
			admissionMatch.push(
				ilike(
					sql`concat_ws(' ', ${table.titleTable.name}, ${table.patientTable.firstName}, ${table.patientTable.middleName}, ${table.patientTable.lastName})`,
					`%${patientName}%`
				)
			);
		}
		if (visitName) {
			admissionMatch.push(
				ilike(table.patientVisitTable.visitNo, `%${visitName}%`)
			);
		}
		const matched = await db
			.select({ bedId: table.ipdAdmissionTable.bedId })
			.from(table.ipdAdmissionTable)
			.innerJoin(
				table.patientVisitTable,
				eq(table.ipdAdmissionTable.visitId, table.patientVisitTable.id)
			)
			.leftJoin(
				table.patientTable,
				eq(table.patientVisitTable.patientId, table.patientTable.id)
			)
			.leftJoin(
				table.titleTable,
				eq(table.patientTable.titleId, table.titleTable.id)
			)
			.where(and(...admissionMatch));
		const bedIds = [...new Set(matched.map((row) => row.bedId))];
		if (bedIds.length === 0) return [];
		conditions.push(inArray(table.bedTable.id, bedIds));
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
		{
			admissionId: number;
			visitId: string;
			visitNo: string | null;
			patientName: string | null;
		}
	>();

	if (bedIds.length > 0) {
		const admissions = await db
			.select({
				admissionId: table.ipdAdmissionTable.id,
				visitId: table.ipdAdmissionTable.visitId,
				visitNo: table.patientVisitTable.visitNo,
				bedId: table.ipdAdmissionTable.bedId,
				titleName: table.titleTable.name,
				firstName: table.patientTable.firstName,
				middleName: table.patientTable.middleName,
				lastName: table.patientTable.lastName
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
			.leftJoin(
				table.titleTable,
				eq(table.patientTable.titleId, table.titleTable.id)
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
			admissionByBed.set(a.bedId, {
				admissionId: a.admissionId,
				visitId: a.visitId,
				visitNo: a.visitNo,
				patientName: patientDisplayName({
					title: { name: a.titleName },
					firstName: a.firstName,
					middleName: a.middleName,
					lastName: a.lastName
				})
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
			visitNo: adm?.visitNo ?? null,
			patientName: adm?.patientName ?? null
		};
	});
}
