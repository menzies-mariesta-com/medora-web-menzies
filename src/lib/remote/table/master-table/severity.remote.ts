import { prerender, query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { SeveritySchema } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ne } from 'drizzle-orm';

/** Get all non-deleted severities (for allergy severity dropdown). */
export const getSeverities = prerender(
	async (): Promise<SeveritySchema[]> => {
		return ensureDb()
			.select()
			.from(table.severityTable)
			.where(ne(table.severityTable.statusId, StatusEnum.DELETED))
			.orderBy(table.severityTable.name);
	},
	{ dynamic: true }
);
