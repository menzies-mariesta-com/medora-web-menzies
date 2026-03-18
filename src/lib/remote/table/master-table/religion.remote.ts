import { prerender, query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { ReligionSchema } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ne } from 'drizzle-orm';

export const getReligion = prerender(
	async (): Promise<ReligionSchema[]> => {
		return ensureDb()
			.select()
			.from(table.religionTable)
			.where(ne(table.religionTable.statusId, StatusEnum.DELETED))
			.orderBy(table.religionTable.name);
	},
	{ dynamic: true }
);
