import { command, query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	HospitalSchema,
	HospitalSchemaInsert,
	HospitalSchemaUpdate
} from '$lib/server/db/schema-type';
import { eq } from 'drizzle-orm';

// get all (for dropdowns and list)
export const getHospital = query(async (): Promise<HospitalSchema[]> => {
	const data = await ensureDb().select().from(table.hospitalTable);
	return data;
});

export type HospitalWithOwner = HospitalSchema & {
	owner?: { id: string; name: string | null; email: string } | null;
};

/** Hospitals with owner relation for list. Pass ownerId to restrict to one owner (e.g. for OWNER role). */
export const getHospitalWithOwner = query(
	'unchecked' as const,
	async (params?: { ownerId?: string | null }): Promise<HospitalWithOwner[]> => {
		return ensureDb().query.hospitalTable.findMany({
			with: {
				owner: {
					columns: { id: true, name: true, email: true },
				},
			},
			...(params?.ownerId != null && params.ownerId !== '' && {
				where: (h, { eq }) => eq(h.ownerId, params.ownerId!),
			}),
		}) as Promise<HospitalWithOwner[]>;
	}
);

// get by id (for code generation, edit form, etc.)
export const getHospitalById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<HospitalSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.hospitalTable)
			.where(eq(table.hospitalTable.id, id));
		return row ?? null;
	}
);

export const createHospital = command(
	'unchecked' as const,
	async (input: HospitalSchemaInsert): Promise<HospitalSchema> => {
		const [inserted] = await ensureDb()
			.insert(table.hospitalTable)
			.values(input)
			.returning();
		if (!inserted) throw new Error('Failed to create hospital');
		// Initialize per-hospital patient code counter
		await ensureDb().insert(table.hospitalPatientCodeCounterTable).values({
			hospitalId: inserted.id,
			lastNumber: 0
		});
		return inserted;
	}
);

export const updateHospital = command(
	'unchecked' as const,
	async ({
		id,
		...data
	}: HospitalSchemaUpdate & { id: number }): Promise<HospitalSchema> => {
		const [updated] = await ensureDb()
			.update(table.hospitalTable)
			.set(data)
			.where(eq(table.hospitalTable.id, id))
			.returning();
		if (!updated) throw new Error('Hospital not found');
		return updated;
	}
);

export const deleteHospital = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.hospitalTable).where(eq(table.hospitalTable.id, id));
	}
);
