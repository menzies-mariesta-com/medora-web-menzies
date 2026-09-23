import { error } from '@sveltejs/kit';
import { and, desc, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

async function visitContext(hospitalId: string, visitId: number) {
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

export async function listClinicalProcedures(input: {
	hospitalId: string;
	visitId: number;
}) {
	return ensureDb()
		.select()
		.from(table.clinicalProcedureTable)
		.where(
			and(
				eq(table.clinicalProcedureTable.hospitalId, input.hospitalId),
				eq(table.clinicalProcedureTable.visitId, input.visitId),
				ne(table.clinicalProcedureTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(desc(table.clinicalProcedureTable.createdAt));
}

export async function saveClinicalProcedure(input: {
	id?: number;
	hospitalId: string;
	visitId: number;
	procedureType: string;
	notes: string;
	performedAt?: string | null;
	doctorId?: string | null;
}) {
	const { id, performedAt, ...rest } = input;
	const visit = await visitContext(input.hospitalId, input.visitId);
	const values = {
		...rest,
		performedAt: performedAt ? new Date(performedAt) : null
	};
	if (id) {
		const [row] = await ensureDb()
			.update(table.clinicalProcedureTable)
			.set(values)
			.where(
				and(
					eq(table.clinicalProcedureTable.id, id),
					eq(
						table.clinicalProcedureTable.hospitalId,
						input.hospitalId
					)
				)
			)
			.returning();
		if (!row) throw error(404, 'Procedure not found');
		return row;
	}
	const [row] = await ensureDb()
		.insert(table.clinicalProcedureTable)
		.values({ ...values, ...visit })
		.returning();
	if (!row) throw error(500, 'Unable to save procedure');
	return row;
}

export async function deleteClinicalProcedure(input: {
	id: number;
	hospitalId: string;
}) {
	await ensureDb()
		.update(table.clinicalProcedureTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.clinicalProcedureTable.id, input.id),
				eq(table.clinicalProcedureTable.hospitalId, input.hospitalId)
			)
		);
}

export async function listOperativeNotes(input: {
	hospitalId: string;
	visitId: number;
}) {
	return ensureDb()
		.select()
		.from(table.operativeNoteTable)
		.where(
			and(
				eq(table.operativeNoteTable.hospitalId, input.hospitalId),
				eq(table.operativeNoteTable.visitId, input.visitId),
				ne(table.operativeNoteTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(desc(table.operativeNoteTable.createdAt));
}

export async function saveOperativeNote(input: {
	id?: number;
	hospitalId: string;
	visitId: number;
	preOp: string;
	findings: string;
	technique: string;
	bloodLoss?: string | null;
	specimens: string;
	postOp: string;
	surgeonId?: string | null;
}) {
	const { id, ...values } = input;
	const visit = await visitContext(input.hospitalId, input.visitId);
	if (id) {
		const [row] = await ensureDb()
			.update(table.operativeNoteTable)
			.set(values)
			.where(
				and(
					eq(table.operativeNoteTable.id, id),
					eq(table.operativeNoteTable.hospitalId, input.hospitalId)
				)
			)
			.returning();
		if (!row) throw error(404, 'Operative note not found');
		return row;
	}
	const [row] = await ensureDb()
		.insert(table.operativeNoteTable)
		.values({ ...values, ...visit })
		.returning();
	if (!row) throw error(500, 'Unable to save operative note');
	return row;
}

export async function deleteOperativeNote(input: {
	id: number;
	hospitalId: string;
}) {
	await ensureDb()
		.update(table.operativeNoteTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.operativeNoteTable.id, input.id),
				eq(table.operativeNoteTable.hospitalId, input.hospitalId)
			)
		);
}
