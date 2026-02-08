import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { ModuleSchema, ModuleSchemaInsert, ModuleSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getModule = query(async (): Promise<ModuleSchema[]> => {
	const data = await ensureDb().select().from(table.moduleTable);
	return data;
});

// get count
export const getModuleCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.moduleTable);
	return row?.count ?? 0;
});

// get all with relations
export const getModuleWithRelations = query(async () => {
	return ensureDb().query.moduleTable.findMany({
		with: {
			status: true,
			pages: true,
		},
	});
});

// get one with relations
export const getModuleByIdWithRelations = query(
	'unchecked' as const,
	async ({ id }: { id: number }) => {
		return ensureDb().query.moduleTable.findFirst({
			where: (t, { eq }) => eq(t.id, id),
			with: {
				status: true,
				pages: true,
			},
		});
	}
);

// get one
export const getModuleById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<ModuleSchema | null> => {
		const [row] = await ensureDb()
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
		const [row] = await ensureDb()
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
		const [row] = await ensureDb()
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
		await ensureDb()
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
		await ensureDb().delete(table.moduleTable).where(eq(table.moduleTable.id, id));
		getModule().refresh();
	}
);
