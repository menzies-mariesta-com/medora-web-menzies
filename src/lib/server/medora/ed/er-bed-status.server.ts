import { and, eq, isNotNull, ne, sql } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { EdBoardColumnEnum } from '$lib/model/enum/perioperative.enum';
import type { ErBedStatusBoardRow } from '$lib/model/type/medora/er/er.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listErBedsForStatus(input: {
	hospitalId: string;
	erWardId?: number;
	bedStatus?: number;
}): Promise<ErBedStatusBoardRow[]> {
	const conditions = [
		eq(table.bedTable.hospitalId, input.hospitalId),
		eq(table.bedTable.isEr, true),
		ne(table.bedTable.statusId, StatusEnum.DELETED)
	];
	if (typeof input.erWardId === 'number') {
		conditions.push(eq(table.wardTable.id, input.erWardId));
	}
	if (typeof input.bedStatus === 'number') {
		conditions.push(eq(table.bedTable.bedStatus, input.bedStatus));
	}

	const beds = await ensureDb()
		.select({
			erBedId: table.bedTable.id,
			erRoomId: table.bedTable.roomId,
			erWardId: table.roomTable.wardId,
			bedName: table.bedTable.name,
			bedCode: table.bedTable.code,
			bedStatus: table.bedTable.bedStatus,
			roomName: table.roomTable.name,
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
		.orderBy(
			table.wardTable.name,
			table.roomTable.name,
			table.bedTable.name
		);

	const occupied = await ensureDb()
		.select({
			erBedId: table.edEncounterTable.erBedId,
			visitId: table.edEncounterTable.visitId,
			visitNo: table.patientVisitTable.visitNo,
			patientName: sql<string>`concat(${table.patientTable.firstName}, ' ', coalesce(${table.patientTable.lastName}, ''))`,
			boardColumn: table.edEncounterTable.boardColumn,
			retainErBedAfterDischarge:
				table.edEncounterTable.retainErBedAfterDischarge
		})
		.from(table.edEncounterTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.edEncounterTable.visitId, table.patientVisitTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.where(
			and(
				eq(table.edEncounterTable.hospitalId, input.hospitalId),
				eq(table.edEncounterTable.statusId, StatusEnum.ACTIVE),
				isNotNull(table.edEncounterTable.erBedId)
			)
		);

	const byBed = new Map<
		number,
		{
			visitId: string;
			visitNo: string | null;
			patientName: string | null;
			dischargedInBed: boolean;
		}
	>();
	for (const row of occupied) {
		if (row.erBedId != null) {
			byBed.set(row.erBedId, {
				visitId: row.visitId,
				visitNo: row.visitNo,
				patientName: row.patientName?.trim() || null,
				dischargedInBed:
					row.boardColumn === EdBoardColumnEnum.DISCHARGED &&
					Boolean(row.retainErBedAfterDischarge)
			});
		}
	}

	return beds.map((b) => {
		const occ = byBed.get(b.erBedId);
		return {
			...b,
			visitId: occ?.visitId ?? null,
			visitNo: occ?.visitNo ?? null,
			patientName: occ?.patientName ?? null,
			dischargedInBed: occ?.dischargedInBed ?? false
		};
	});
}
