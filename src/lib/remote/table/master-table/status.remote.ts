import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StatusSchema, StatusSchemaInsert } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getStatus = query(async (): Promise<StatusSchema[]> => {
	const data = await db.select().from(table.statusTable);
	return data;
});

// get count
export const getStatusCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.statusTable);
	return row?.count ?? 0;
});

// get one
export const getStatusById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StatusSchema | null> => {
		const [row] = await db
			.select()
			.from(table.statusTable)
			.where(eq(table.statusTable.id, id));
		return row ?? null;
	}
);

// create
export const createStatus = command(
	'unchecked' as const,
	async (payload: { name: string }): Promise<StatusSchema> => {
		const [row] = await db
			.insert(table.statusTable)
			.values({ name: payload.name })
			.returning();
		if (!row) throw new Error('Insert failed');
		getStatus().refresh();
		return row;
	}
);

// update
export const updateStatus = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string }): Promise<StatusSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.statusTable)
			.set(rest as Partial<StatusSchemaInsert>)
			.where(eq(table.statusTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStatus().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deleteStatus = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.statusTable).where(eq(table.statusTable.id, id));
		getStatus().refresh();
	}
);

// delete complete (hard)
export const deleteStatusComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.statusTable).where(eq(table.statusTable.id, id));
		getStatus().refresh();
	}
);
