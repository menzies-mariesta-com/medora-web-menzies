import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { ModuleSchema, ModuleSchemaInsert, ModuleSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getModule = query(async (): Promise<ModuleSchema[]> => {
	const data = await db.select().from(table.moduleTable);
	return data;
});

// get count
export const getModuleCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.moduleTable);
	return row?.count ?? 0;
});

// get one
export const getModuleById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<ModuleSchema | null> => {
		const [row] = await db
			.select()
			.from(table.moduleTable)
			.where(eq(table.moduleTable.id, id));
		return row ?? null;
	}
);

// create
export const createModule = command(
	'unchecked' as const,
	async (payload: ModuleSchemaInsert): Promise<ModuleSchema> => {
		const [row] = await db
			.insert(table.moduleTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getModule().refresh();
		return row;
	}
);

// update
export const updateModule = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		icon?: string | null;
		statusId?: number;
	}): Promise<ModuleSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.moduleTable)
			.set(rest as ModuleSchemaUpdate)
			.where(eq(table.moduleTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getModule().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteModule = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.moduleTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.moduleTable.id, id));
		getModule().refresh();
	}
);

// delete complete (hard)
export const deleteModuleComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.moduleTable).where(eq(table.moduleTable.id, id));
		getModule().refresh();
	}
);
