import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { maritalStatusSchema, maritalStatusSchemaInsert, maritalStatusSchemaUpdate } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getmaritalStatus = query(async (): Promise<maritalStatusSchema[]> => {
	const data = await db.select().from(table.maritalStatusTable);
	return data;
});

// get count
export const getmaritalStatusCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.maritalStatusTable);
	return row?.count ?? 0;
});

// get one
export const getmaritalStatusById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<maritalStatusSchema | null> => {
		const [row] = await db
			.select()
			.from(table.maritalStatusTable)
			.where(eq(table.maritalStatusTable.id, id));
		return row ?? null;
	}
);

// create
export const createmaritalStatus = command(
	'unchecked' as const,
	async (payload: maritalStatusSchemaInsert): Promise<maritalStatusSchema> => {
		const [row] = await db
			.insert(table.maritalStatusTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getmaritalStatus().refresh();
		return row;
	}
);

// update
export const updatemaritalStatus = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string }): Promise<maritalStatusSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.maritalStatusTable)
			.set(rest as maritalStatusSchemaUpdate)
			.where(eq(table.maritalStatusTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getmaritalStatus().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deletemaritalStatus = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.maritalStatusTable).where(eq(table.maritalStatusTable.id, id));
		getmaritalStatus().refresh();
	}
);

// delete complete (hard)
export const deletemaritalStatusComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.maritalStatusTable).where(eq(table.maritalStatusTable.id, id));
		getmaritalStatus().refresh();
	}
);
