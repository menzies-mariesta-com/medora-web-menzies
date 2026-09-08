import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StatusSchema } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ne } from 'drizzle-orm';

export async function listStatuses(): Promise<StatusSchema[]> {
	return ensureDb()
		.select()
		.from(table.statusTable)
		.where(ne(table.statusTable.id, StatusEnum.DELETED))
		.orderBy(table.statusTable.name);
}
