import { query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { HospitalSchema } from '$lib/server/db/schema-type';

// get all (for dropdowns)
export const getHospital = query(async (): Promise<HospitalSchema[]> => {
	const data = await ensureDb().select().from(table.hospitalTable);
	return data;
});
