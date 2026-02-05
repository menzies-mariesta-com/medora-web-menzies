import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { PageSchema, PageSchemaInsert, PageSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getPage = query(async (): Promise<PageSchema[]> => {
	const data = await db.select().from(table.pageTable);
	return data;
});

// get count
export const getPageCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.pageTable);
	return row?.count ?? 0;
});

// get one
export const getPageById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<PageSchema | null> => {
		const [row] = await db
			.select()
			.from(table.pageTable)
			.where(eq(table.pageTable.id, id));
		return row ?? null;
	}
);

// create
export const createPage = command(
	'unchecked' as const,
	async (payload: PageSchemaInsert): Promise<PageSchema> => {
		const [row] = await db
			.insert(table.pageTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPage().refresh();
		return row;
	}
);

// update
export const updatePage = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		icon?: string | null;
		moduleId?: number | null;
		statusId?: number | null;
	}): Promise<PageSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.pageTable)
			.set(rest as PageSchemaUpdate)
			.where(eq(table.pageTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPage().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deletePage = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.pageTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.pageTable.id, id));
		getPage().refresh();
	}
);

// delete complete (hard)
export const deletePageComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.pageTable).where(eq(table.pageTable.id, id));
		getPage().refresh();
	}
);
