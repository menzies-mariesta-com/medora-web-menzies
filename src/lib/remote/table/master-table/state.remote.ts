import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StateSchema, StateSchemaInsert, StateSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getState = query(async (): Promise<StateSchema[]> => {
	const data = await db.select().from(table.stateTable);
	return data;
});

// get count
export const getStateCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.stateTable);
	return row?.count ?? 0;
});

// get one
export const getStateById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StateSchema | null> => {
		const [row] = await db
			.select()
			.from(table.stateTable)
			.where(eq(table.stateTable.id, id));
		return row ?? null;
	}
);

// create
export const createState = command(
	'unchecked' as const,
	async (payload: StateSchemaInsert): Promise<StateSchema> => {
		const [row] = await db
			.insert(table.stateTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getState().refresh();
		return row;
	}
);

// update
export const updateState = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string;
		code?: string | null;
		countryId?: number | null;
		statusId?: number | null;
	}): Promise<StateSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.stateTable)
			.set(rest as StateSchemaUpdate)
			.where(eq(table.stateTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getState().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteState = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.stateTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.stateTable.id, id));
		getState().refresh();
	}
);

// delete complete (hard)
export const deleteStateComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.stateTable).where(eq(table.stateTable.id, id));
		getState().refresh();
	}
);
