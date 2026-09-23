import { and, desc, eq, ilike, ne, or } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	DiagnosisCodeOption,
	ProblemListRow
} from '$lib/model/type/medora/clinical.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function searchDiagnosisCodes(input: {
	search?: string;
	limit?: number;
}): Promise<DiagnosisCodeOption[]> {
	const query = input.search?.trim();
	const filter = query
		? and(
				eq(table.diagnosisCodeTable.statusId, StatusEnum.ACTIVE),
				or(
					ilike(table.diagnosisCodeTable.code, `%${query}%`),
					ilike(table.diagnosisCodeTable.description, `%${query}%`)
				)
			)
		: eq(table.diagnosisCodeTable.statusId, StatusEnum.ACTIVE);
	return ensureDb()
		.select({
			id: table.diagnosisCodeTable.id,
			code: table.diagnosisCodeTable.code,
			system: table.diagnosisCodeTable.system,
			description: table.diagnosisCodeTable.description
		})
		.from(table.diagnosisCodeTable)
		.where(filter)
		.orderBy(table.diagnosisCodeTable.code)
		.limit(Math.min(100, Math.max(1, input.limit ?? 30)));
}

export async function getDiagnosisCode(id: number) {
	const [row] = await ensureDb()
		.select()
		.from(table.diagnosisCodeTable)
		.where(
			and(
				eq(table.diagnosisCodeTable.id, id),
				eq(table.diagnosisCodeTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function listProblemList(input: {
	hospitalId: string;
	patientId: string;
}): Promise<ProblemListRow[]> {
	const rows = await ensureDb()
		.select({
			id: table.diagnosisTable.id,
			visitId: table.diagnosisTable.visitId,
			visitNo: table.patientVisitTable.visitNo,
			diagnosisType: table.diagnosisTypeTable.name,
			code: table.diagnosisCodeTable.code,
			description: table.diagnosisTable.description,
			codeDescription: table.diagnosisCodeTable.description,
			createdAt: table.diagnosisTable.createdAt
		})
		.from(table.diagnosisTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.diagnosisTable.visitId, table.patientVisitTable.id)
		)
		.innerJoin(
			table.diagnosisTypeTable,
			eq(
				table.diagnosisTable.diagnosisTypeId,
				table.diagnosisTypeTable.id
			)
		)
		.leftJoin(
			table.diagnosisCodeTable,
			eq(
				table.diagnosisTable.diagnosisCodeId,
				table.diagnosisCodeTable.id
			)
		)
		.where(
			and(
				eq(table.diagnosisTable.patientId, input.patientId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId),
				ne(table.diagnosisTable.statusId, StatusEnum.DELETED),
				or(
					ilike(table.diagnosisTypeTable.name, '%chronic%'),
					and(
						ilike(table.diagnosisTypeTable.name, '%final%'),
						eq(table.diagnosisTable.statusId, StatusEnum.ACTIVE)
					)
				)
			)
		)
		.orderBy(desc(table.diagnosisTable.createdAt));
	return rows.map((row) => ({
		id: row.id,
		visitId: row.visitId,
		visitNo: row.visitNo,
		diagnosisType: row.diagnosisType,
		code: row.code,
		description: row.description ?? row.codeDescription,
		createdAt: String(row.createdAt ?? '') || null
	}));
}
