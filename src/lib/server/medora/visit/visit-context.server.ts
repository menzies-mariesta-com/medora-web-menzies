import { error } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

/** `branch_id` and `patient_id` are visit-derived: never trust them from a request. */
export async function visitContext(
	hospitalId: string,
	visitId: string
): Promise<{ branchId: string; patientId: string }> {
	const [visit] = await ensureDb()
		.select({
			branchId: table.patientVisitTable.branchId,
			patientId: table.patientVisitTable.patientId
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, visitId),
				eq(table.patientVisitTable.hospitalId, hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');
	return visit;
}

/** Patient name/code and visit number, for charts that print a header. */
export async function visitPatientIdentity(input: {
	hospitalId: string;
	visitId: string;
}): Promise<{
	name: string;
	code: string | null;
	visitNo: string | null;
}> {
	const [row] = await ensureDb()
		.select({
			visitNo: table.patientVisitTable.visitNo,
			code: table.patientTable.code,
			titleName: table.titleTable.name,
			firstName: table.patientTable.firstName,
			middleName: table.patientTable.middleName,
			lastName: table.patientTable.lastName
		})
		.from(table.patientVisitTable)
		.innerJoin(
			table.patientTable,
			eq(table.patientTable.id, table.patientVisitTable.patientId)
		)
		.leftJoin(
			table.titleTable,
			eq(table.titleTable.id, table.patientTable.titleId)
		)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!row) throw error(404, 'Visit not found');
	const name = [
		row.titleName,
		row.firstName,
		row.middleName,
		row.lastName
	]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(' ');
	return {
		name: name || '—',
		code: row.code ?? null,
		visitNo: row.visitNo ?? null
	};
}
