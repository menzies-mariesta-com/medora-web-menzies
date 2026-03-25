import { command, query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DiagnosisSchema,
	DiagnosisSchemaInsert,
	DiagnosisSchemaUpdate,
	DiagnosisTypeSchema
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { and, eq, ne } from 'drizzle-orm';

export type DiagnosisWithType = DiagnosisSchema & {
	diagnosisType: DiagnosisTypeSchema | null;
};

/** Active diagnosis types (Provisional / Final / Chronic, etc.). */
export const getDiagnosisTypes = query(
	async (): Promise<DiagnosisTypeSchema[]> => {
		return ensureDb()
			.select()
			.from(table.diagnosisTypeTable)
			.where(ne(table.diagnosisTypeTable.statusId, StatusEnum.DELETED))
			.orderBy(table.diagnosisTypeTable.name);
	}
);

export const getDiagnosisById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<DiagnosisWithType | null> => {
		const row = await ensureDb().query.diagnosisTable.findFirst({
			where: (t, { and, eq, ne }) =>
				and(eq(t.id, id), ne(t.statusId, StatusEnum.DELETED)),
			with: { diagnosisType: true }
		});
		return row as DiagnosisWithType | null;
	}
);

/** Visit-scoped diagnosis classifications (excludes soft-deleted rows). */
export const getDiagnosesByVisitId = query(
	'unchecked' as const,
	async ({
		visitId
	}: {
		visitId: number;
	}): Promise<DiagnosisWithType[]> => {
		return (await ensureDb().query.diagnosisTable.findMany({
			where: (t, { and, eq, ne }) =>
				and(eq(t.visitId, visitId), ne(t.statusId, StatusEnum.DELETED)),
			with: { diagnosisType: true },
			orderBy: (t, { desc }) => desc(t.createdAt)
		})) as DiagnosisWithType[];
	}
);

export const createDiagnosis = command(
	'unchecked' as const,
	async (
		payload: DiagnosisSchemaInsert
	): Promise<DiagnosisSchema> => {
		const [row] = await ensureDb()
			.insert(table.diagnosisTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getDiagnosesByVisitId({ visitId: payload.visitId }).refresh();
		return row;
	}
);

export const updateDiagnosis = command(
	'unchecked' as const,
	async ({
		id,
		...data
	}: {
		id: number;
	} & DiagnosisSchemaUpdate): Promise<DiagnosisSchema> => {
		const [existing] = await ensureDb()
			.select({ visitId: table.diagnosisTable.visitId })
			.from(table.diagnosisTable)
			.where(eq(table.diagnosisTable.id, id))
			.limit(1);
		if (!existing) throw new Error('Diagnosis not found');
		const [row] = await ensureDb()
			.update(table.diagnosisTable)
			.set(data)
			.where(eq(table.diagnosisTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getDiagnosesByVisitId({ visitId: existing.visitId }).refresh();
		getDiagnosisById({ id }).refresh();
		return row;
	}
);

export const deleteDiagnosis = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		const [existing] = await ensureDb()
			.select({ visitId: table.diagnosisTable.visitId })
			.from(table.diagnosisTable)
			.where(eq(table.diagnosisTable.id, id))
			.limit(1);
		if (!existing) throw new Error('Diagnosis not found');
		await ensureDb()
			.update(table.diagnosisTable)
			.set({ statusId: StatusEnum.INACTIVE })
			.where(eq(table.diagnosisTable.id, id));
		getDiagnosesByVisitId({ visitId: existing.visitId }).refresh();
		getDiagnosisById({ id }).refresh();
	}
);
