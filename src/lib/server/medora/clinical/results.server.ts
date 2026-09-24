import { error } from '@sveltejs/kit';
import { and, desc, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

async function assertVisitInHospital(
	hospitalId: string,
	visitId: number
): Promise<void> {
	const [visit] = await ensureDb()
		.select({ id: table.patientVisitTable.id })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, visitId),
				eq(table.patientVisitTable.hospitalId, hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');
}

export async function listResults(input: {
	hospitalId: string;
	visitId: number;
}) {
	const db = ensureDb();
	const common = (
		hospitalId: typeof table.labResultTable.hospitalId
	) =>
		and(
			eq(hospitalId, input.hospitalId),
			ne(table.labResultTable.statusId, StatusEnum.DELETED)
		);
	const [labs, imaging] = await Promise.all([
		db
			.select()
			.from(table.labResultTable)
			.where(
				and(
					common(table.labResultTable.hospitalId),
					eq(table.labResultTable.visitId, input.visitId)
				)
			)
			.orderBy(desc(table.labResultTable.createdAt)),
		db
			.select()
			.from(table.imagingResultTable)
			.where(
				and(
					eq(table.imagingResultTable.hospitalId, input.hospitalId),
					eq(table.imagingResultTable.visitId, input.visitId),
					ne(table.imagingResultTable.statusId, StatusEnum.DELETED)
				)
			)
			.orderBy(desc(table.imagingResultTable.createdAt))
	]);
	return { labs, imaging };
}

export async function saveLabResult(input: {
	id?: number;
	hospitalId: string;
	visitId: number;
	serviceOrderDetailId?: number | null;
	resultText: string;
	resultJson?: string | null;
	isCritical?: boolean;
	enteredBy?: string | null;
}) {
	await assertVisitInHospital(input.hospitalId, input.visitId);
	const { id, ...values } = input;
	if (id) {
		const [row] = await ensureDb()
			.update(table.labResultTable)
			.set(values)
			.where(
				and(
					eq(table.labResultTable.id, id),
					eq(table.labResultTable.hospitalId, input.hospitalId)
				)
			)
			.returning();
		if (!row) throw error(404, 'Lab result not found');
		return row;
	}
	const [row] = await ensureDb()
		.insert(table.labResultTable)
		.values(values)
		.returning();
	if (!row) throw error(500, 'Unable to save lab result');
	return row;
}

export async function saveImagingResult(input: {
	id?: number;
	hospitalId: string;
	visitId: number;
	serviceOrderDetailId?: number | null;
	findings: string;
	attachmentUrl?: string | null;
	enteredBy?: string | null;
}) {
	await assertVisitInHospital(input.hospitalId, input.visitId);
	const { id, ...values } = input;
	if (id) {
		const [row] = await ensureDb()
			.update(table.imagingResultTable)
			.set(values)
			.where(
				and(
					eq(table.imagingResultTable.id, id),
					eq(table.imagingResultTable.hospitalId, input.hospitalId)
				)
			)
			.returning();
		if (!row) throw error(404, 'Imaging result not found');
		return row;
	}
	const [row] = await ensureDb()
		.insert(table.imagingResultTable)
		.values(values)
		.returning();
	if (!row) throw error(500, 'Unable to save imaging result');
	return row;
}

export async function endorseResult(input: {
	kind: 'lab' | 'imaging';
	id: number;
	hospitalId: string;
	staffId: string;
}) {
	const target =
		input.kind === 'lab'
			? table.labResultTable
			: table.imagingResultTable;
	const [row] = await ensureDb()
		.update(target)
		.set({ endorsedAt: new Date(), endorsedBy: input.staffId })
		.where(
			and(
				eq(target.id, input.id),
				eq(target.hospitalId, input.hospitalId)
			)
		)
		.returning();
	if (!row) throw error(404, 'Result not found');
	return row;
}

export async function deleteResult(input: {
	kind: 'lab' | 'imaging';
	id: number;
	hospitalId: string;
}) {
	const target =
		input.kind === 'lab'
			? table.labResultTable
			: table.imagingResultTable;
	await ensureDb()
		.update(target)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(target.id, input.id),
				eq(target.hospitalId, input.hospitalId)
			)
		);
}
