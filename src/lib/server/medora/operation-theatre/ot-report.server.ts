import { error } from '@sveltejs/kit';
import {
	and,
	asc,
	eq,
	gte,
	lte,
	ne,
	inArray,
	type SQL
} from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { OtReportRow } from '$lib/model/type/medora/operation-theatre.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	otSurgeon,
	patientDisplayNameSql,
	staffDisplayNameSql
} from './ot-shared.server';

export async function listOtReport(input: {
	hospitalId: string;
	branchId?: string | null;
	fromDate: string;
	toDate: string;
	statusTaggingId?: number | null;
	limit?: number;
}): Promise<OtReportRow[]> {
	if (!input.fromDate || !input.toDate) {
		throw error(400, 'From date and to date are required.');
	}
	if (input.fromDate > input.toDate) {
		throw error(400, 'From date must be on or before to date.');
	}
	const conditions: SQL[] = [
		eq(table.surgicalCaseTable.hospitalId, input.hospitalId),
		ne(table.surgicalCaseTable.statusId, StatusEnum.DELETED),
		gte(
			table.surgicalCaseTable.scheduledStart,
			`${input.fromDate}T00:00:00.000Z`
		),
		lte(
			table.surgicalCaseTable.scheduledStart,
			`${input.toDate}T23:59:59.999Z`
		),
		inArray(
			table.surgicalCaseTable.statusTaggingId,
			[90, 91, 92, 93, 94, 95]
		)
	];
	if (input.branchId) {
		conditions.push(
			eq(table.surgicalCaseTable.branchId, input.branchId)
		);
	}
	if (input.statusTaggingId) {
		conditions.push(
			eq(
				table.surgicalCaseTable.statusTaggingId,
				input.statusTaggingId
			)
		);
	}

	const rows = await ensureDb()
		.select({
			sc: table.surgicalCaseTable,
			hrn: table.patientTable.code,
			patientName: patientDisplayNameSql(),
			theatreName: table.otRoomTable.name,
			branchName: table.hospitalBranchTable.name,
			surgeonName: staffDisplayNameSql(otSurgeon),
			serviceName: table.serviceItemTable.serviceName,
			statusName: table.statusTaggingTable.name,
			statusCode: table.statusTaggingTable.code
		})
		.from(table.surgicalCaseTable)
		.innerJoin(
			table.patientTable,
			eq(table.surgicalCaseTable.patientId, table.patientTable.id)
		)
		.leftJoin(
			table.otRoomTable,
			eq(table.surgicalCaseTable.otRoomId, table.otRoomTable.id)
		)
		.leftJoin(
			table.hospitalBranchTable,
			eq(
				table.surgicalCaseTable.branchId,
				table.hospitalBranchTable.id
			)
		)
		.leftJoin(
			otSurgeon,
			eq(table.surgicalCaseTable.surgeonId, otSurgeon.id)
		)
		.leftJoin(
			table.serviceItemTable,
			eq(table.surgicalCaseTable.serviceId, table.serviceItemTable.id)
		)
		.leftJoin(
			table.statusTaggingTable,
			eq(
				table.surgicalCaseTable.statusTaggingId,
				table.statusTaggingTable.id
			)
		)
		.where(and(...conditions))
		.orderBy(
			asc(table.surgicalCaseTable.scheduledStart),
			asc(table.surgicalCaseTable.id)
		)
		.limit(Math.min(5000, Math.max(1, input.limit ?? 1000)));

	return rows.map((r) => ({
		id: r.sc.id,
		bookingNo: r.sc.bookingNo,
		otDate: r.sc.scheduledStart,
		theatreName: r.theatreName,
		facilityName: r.branchName,
		hrn: r.hrn,
		patientName: r.patientName ?? '—',
		surgeonName: r.surgeonName,
		serviceName: r.serviceName ?? r.sc.procedureName,
		statusName: r.statusName,
		statusCode: r.statusCode,
		startTime: r.sc.scheduledStart,
		endTime: r.sc.scheduledEnd,
		priority: r.sc.priority
	}));
}
