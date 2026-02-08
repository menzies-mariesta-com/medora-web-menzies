import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { MaritalStatusSchema, MaritalStatusSchemaInsert, MaritalStatusSchemaUpdate } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getMaritalStatus = query(async (): Promise<MaritalStatusSchema[]> => {
	const data = await ensureDb().select().from(table.maritalStatusTable);
	return data;
});

// get count
export const getMaritalStatusCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.maritalStatusTable);
	return row?.count ?? 0;
});

// get one
export const getMaritalStatusById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<MaritalStatusSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.maritalStatusTable)
			.where(eq(table.maritalStatusTable.id, id));
		return row ?? null;
	}
);

// create
export const createMaritalStatus = command(
	'unchecked' as const,
	async (payload: MaritalStatusSchemaInsert): Promise<MaritalStatusSchema> => {
		const [row] = await ensureDb()
			.insert(table.maritalStatusTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getMaritalStatus().refresh();
		return row;
	}
);

// update
export const updateMaritalStatus = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string }): Promise<MaritalStatusSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.maritalStatusTable)
			.set(rest as MaritalStatusSchemaUpdate)
			.where(eq(table.maritalStatusTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getMaritalStatus().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deleteMaritalStatus = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.maritalStatusTable).where(eq(table.maritalStatusTable.id, id));
		getMaritalStatus().refresh();
	}
);

// delete complete (hard)
export const deleteMaritalStatusComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.maritalStatusTable).where(eq(table.maritalStatusTable.id, id));
		getMaritalStatus().refresh();
	}
);
