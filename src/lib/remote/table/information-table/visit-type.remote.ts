import { query } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { VisitTypeSchema } from '$lib/server/db/table/master-table/master-table-schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ne } from 'drizzle-orm';

/** Get all visit types (excluding soft-deleted). */
export const getVisitType = query(
	async (): Promise<VisitTypeSchema[]> => {
		return ensureDb()
			.select()
			.from(table.visitTypeTable)
			.where(ne(table.visitTypeTable.statusId, StatusEnum.DELETED))
			.orderBy(table.visitTypeTable.name);
	}
);
