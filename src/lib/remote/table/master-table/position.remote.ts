import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PositionSchema,
	PositionSchemaInsert,
	PositionSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getPosition = query(async (): Promise<PositionSchema[]> => {
	const data = await db.select().from(table.positionTable);
	return data;
});

// get count
export const getPositionCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.positionTable);
	return row?.count ?? 0;
});

// get one
export const getPositionById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<PositionSchema | null> => {
		const [row] = await db
			.select()
			.from(table.positionTable)
			.where(eq(table.positionTable.id, id));
		return row ?? null;
	}
);

// create
export const createPosition = command(
	'unchecked' as const,
	async (payload: PositionSchemaInsert): Promise<PositionSchema> => {
		const [row] = await db
			.insert(table.positionTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPosition().refresh();
		return row;
	}
);

// update
export const updatePosition = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string | null; statusId?: number | null }): Promise<PositionSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.positionTable)
			.set(rest as PositionSchemaUpdate)
			.where(eq(table.positionTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPosition().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deletePosition = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.positionTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.positionTable.id, id));
		getPosition().refresh();
	}
);

// delete complete (hard)
export const deletePositionComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.positionTable).where(eq(table.positionTable.id, id));
		getPosition().refresh();
	}
);
