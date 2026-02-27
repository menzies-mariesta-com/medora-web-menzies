import { query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { ReligionSchema } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { eq } from 'drizzle-orm';

export const getReligion = query(async (): Promise<ReligionSchema[]> => {
	return ensureDb()
		.select()
		.from(table.religionTable)
		.where(eq(table.religionTable.statusId, StatusEnum.ACTIVE))
		.orderBy(table.religionTable.name);
});
