import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { MarialStatusSchema, MarialStatusSchemaInsert } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getMarialStatus = query(async (): Promise<MarialStatusSchema[]> => {
	const data = await db.select().from(table.marialStatusTable);
	return data;
});

// get count
export const getMarialStatusCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.marialStatusTable);
	return row?.count ?? 0;
});

// get one
export const getMarialStatusById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<MarialStatusSchema | null> => {
		const [row] = await db
			.select()
			.from(table.marialStatusTable)
			.where(eq(table.marialStatusTable.id, id));
		return row ?? null;
	}
);

// create
export const createMarialStatus = command(
	'unchecked' as const,
	async (payload: { name: string }): Promise<MarialStatusSchema> => {
		const [row] = await db
			.insert(table.marialStatusTable)
			.values({ name: payload.name })
			.returning();
		if (!row) throw new Error('Insert failed');
		getMarialStatus().refresh();
		return row;
	}
);

// update
export const updateMarialStatus = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string }): Promise<MarialStatusSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.marialStatusTable)
			.set(rest as Partial<MarialStatusSchemaInsert>)
			.where(eq(table.marialStatusTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getMarialStatus().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deleteMarialStatus = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.marialStatusTable).where(eq(table.marialStatusTable.id, id));
		getMarialStatus().refresh();
	}
);

// delete complete (hard)
export const deleteMarialStatusComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.marialStatusTable).where(eq(table.marialStatusTable.id, id));
		getMarialStatus().refresh();
	}
);
