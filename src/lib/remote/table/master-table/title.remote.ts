import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { TitleSchema, TitleSchemaInsert, TitleSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getTitle = query(async (): Promise<TitleSchema[]> => {
	const data = await db.select().from(table.titleTable);
	return data;
});

// get count
export const getTitleCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.titleTable);
	return row?.count ?? 0;
});

// get one
export const getTitleById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<TitleSchema | null> => {
		const [row] = await db
			.select()
			.from(table.titleTable)
			.where(eq(table.titleTable.id, id));
		return row ?? null;
	}
);

// create
export const createTitle = command(
	'unchecked' as const,
	async (payload: TitleSchemaInsert): Promise<TitleSchema> => {
		const [row] = await db
			.insert(table.titleTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getTitle().refresh();
		return row;
	}
);

// update
export const updateTitle = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string | null; statusId?: number | null }): Promise<TitleSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.titleTable)
			.set(rest as TitleSchemaUpdate)
			.where(eq(table.titleTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getTitle().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteTitle = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.titleTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.titleTable.id, id));
		getTitle().refresh();
	}
);

// delete complete (hard)
export const deleteTitleComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.titleTable).where(eq(table.titleTable.id, id));
		getTitle().refresh();
	}
);
