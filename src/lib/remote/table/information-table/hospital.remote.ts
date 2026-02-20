import { query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { HospitalSchema } from '$lib/server/db/schema-type';
import { eq } from 'drizzle-orm';

// get all (for dropdowns)
export const getHospital = query(async (): Promise<HospitalSchema[]> => {
	const data = await ensureDb().select().from(table.hospitalTable);
	return data;
});

// get by id (for code generation etc.)
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
