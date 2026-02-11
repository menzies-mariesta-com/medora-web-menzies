import { query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { ReligionSchema } from '$lib/server/db/schema-type';

// get all
export const getReligion = query(async (): Promise<ReligionSchema[]> => {
	const data = await ensureDb().select().from(table.religionTable);
	return data;
});
