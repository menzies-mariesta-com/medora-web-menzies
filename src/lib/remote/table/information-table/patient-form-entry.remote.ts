import { command, query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientFormEntrySchema,
	PatientFormEntrySchemaInsert,
	PatientFormEntrySchemaUpdate,
	FormNameSchema
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { and, eq, ne } from 'drizzle-orm';
import { assertVisitNotClinicallySigned } from '$lib/server/visit-clinical-lock.server';

function prettifyFormCode(code: string): string {
	return code
		.trim()
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.replace(/\b\w/g, (m) => m.toUpperCase());
}

export type PatientFormEntryWithRelations = PatientFormEntrySchema & {
	formName: FormNameSchema | null;
};

export const getPatientFormEntryById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<PatientFormEntryWithRelations | null> => {
		const row =
			await ensureDb().query.patientFormEntryTable.findFirst({
				where: (t, { and, eq, ne }) =>
					and(eq(t.id, id), ne(t.statusId, StatusEnum.DELETED)),
				with: { formName: true }
			});
		return row as PatientFormEntryWithRelations | null;
	}
);

export const getPatientFormEntriesByVisitIdAndFormCode = query(
	'unchecked' as const,
	async ({
		visitId,
		formCode
	}: {
		visitId: number;
		formCode: string;
	}): Promise<PatientFormEntryWithRelations[]> => {
		const code = formCode.trim();
		if (!code) return [];
		const formNameId = await getFormNameIdByCode(code);
		if (!formNameId) return [];
		return (await ensureDb().query.patientFormEntryTable.findMany({
			where: (t, { and, eq, ne }) =>
				and(
					eq(t.visitId, visitId),
					eq(t.formNameId, formNameId),
					ne(t.statusId, StatusEnum.DELETED)
				),
			with: { formName: true },
			orderBy: (t, { desc }) => desc(t.createdAt)
		})) as PatientFormEntryWithRelations[];
	}
);

async function getFormNameIdByCode(
	code: string
): Promise<number | null> {
	const row = await ensureDb().query.formNameTable.findFirst({
		where: (t, { and, eq, ne }) =>
			and(eq(t.code, code.trim()), ne(t.statusId, StatusEnum.DELETED))
	});
	return row?.id ?? null;
}

async function ensureFormNameIdByCode(code: string): Promise<number> {
	const normalizedCode = code.trim();
	const existingId = await getFormNameIdByCode(normalizedCode);
	if (existingId) return existingId;
	const [created] = await ensureDb()
		.insert(table.formNameTable)
		.values({
			code: normalizedCode,
			name: prettifyFormCode(normalizedCode),
			formType: 'observation_emr_visit',
			statusId: StatusEnum.ACTIVE
		})
		.returning({ id: table.formNameTable.id });
	if (!created)
		throw new Error(`Unable to create form name: ${normalizedCode}`);
	return created.id;
}

export const createPatientFormEntry = command(
	'unchecked' as const,
	async (
		payload: Omit<PatientFormEntrySchemaInsert, 'formNameId'> & {
			formCode: string;
		}
	): Promise<PatientFormEntrySchema> => {
		await assertVisitNotClinicallySigned(payload.visitId);
		const formNameId = await ensureFormNameIdByCode(payload.formCode);
		const { formCode: _formCode, ...rest } = payload;
		const [row] = await ensureDb()
			.insert(table.patientFormEntryTable)
			.values({ ...rest, formNameId })
			.returning();
		if (!row) throw new Error('Insert failed');
		getPatientFormEntriesByVisitIdAndFormCode({
			visitId: payload.visitId,
			formCode: payload.formCode
		}).refresh();
		return row;
	}
);

export const updatePatientFormEntry = command(
	'unchecked' as const,
	async ({
		id,
		...data
	}: {
		id: number;
	} & PatientFormEntrySchemaUpdate): Promise<PatientFormEntrySchema> => {
		const [existing] = await ensureDb()
			.select({
				visitId: table.patientFormEntryTable.visitId,
				formNameId: table.patientFormEntryTable.formNameId
			})
			.from(table.patientFormEntryTable)
			.where(eq(table.patientFormEntryTable.id, id))
			.limit(1);
		if (!existing) throw new Error('Form entry not found');
		await assertVisitNotClinicallySigned(existing.visitId);
		const formName = await ensureDb().query.formNameTable.findFirst({
			where: (t, { eq }) => eq(t.id, existing.formNameId)
		});
		const [row] = await ensureDb()
			.update(table.patientFormEntryTable)
			.set(data)
			.where(eq(table.patientFormEntryTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		if (formName?.code) {
			getPatientFormEntriesByVisitIdAndFormCode({
				visitId: existing.visitId,
				formCode: formName.code
			}).refresh();
		}
		getPatientFormEntryById({ id }).refresh();
		return row;
	}
);

export const deletePatientFormEntry = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		const [existing] = await ensureDb()
			.select({
				visitId: table.patientFormEntryTable.visitId,
				formNameId: table.patientFormEntryTable.formNameId
			})
			.from(table.patientFormEntryTable)
			.where(eq(table.patientFormEntryTable.id, id))
			.limit(1);
		if (!existing) throw new Error('Form entry not found');
		await assertVisitNotClinicallySigned(existing.visitId);
		const formName = await ensureDb().query.formNameTable.findFirst({
			where: (t, { eq }) => eq(t.id, existing.formNameId)
		});
		await ensureDb()
			.update(table.patientFormEntryTable)
			.set({ statusId: StatusEnum.INACTIVE })
			.where(eq(table.patientFormEntryTable.id, id));
		if (formName?.code) {
			getPatientFormEntriesByVisitIdAndFormCode({
				visitId: existing.visitId,
				formCode: formName.code
			}).refresh();
		}
		getPatientFormEntryById({ id }).refresh();
	}
);
