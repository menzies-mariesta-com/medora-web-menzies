import { query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { SeveritySchema } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { eq } from 'drizzle-orm';

/** Get all active severities (for allergy severity dropdown). */
export const getSeverities = query(
	async (): Promise<SeveritySchema[]> => {
		return ensureDb()
			.select()
			.from(table.severityTable)
			.where(eq(table.severityTable.statusId, StatusEnum.ACTIVE))
			.orderBy(table.severityTable.name);
	}
);
