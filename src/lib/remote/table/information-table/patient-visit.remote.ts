import { command, query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PatientVisitSchema,
	PatientVisitSchemaInsert,
	PatientVisitSchemaUpdate
} from '$lib/server/db/schema-type';
import { eq } from 'drizzle-orm';

// get all
export const getPatientVisit = query(async (): Promise<PatientVisitSchema[]> => {
	const data = await ensureDb().select().from(table.patientVisitTable);
	return data;
});

// create
export const createPatientVisit = command(
	'unchecked' as const,
	async (payload: PatientVisitSchemaInsert): Promise<PatientVisitSchema> => {
		const [row] = await ensureDb()
			.insert(table.patientVisitTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPatientVisit().refresh();
		return row;
	}
);

// update
export const updatePatientVisit = command(
	'unchecked' as const,
	async (payload: { id: number } & PatientVisitSchemaUpdate): Promise<PatientVisitSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.patientVisitTable)
			.set(rest as PatientVisitSchemaUpdate)
			.where(eq(table.patientVisitTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPatientVisit().refresh();
		return row;
	}
);

