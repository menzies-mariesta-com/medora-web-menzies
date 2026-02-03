import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { RoleSchema, RoleSchemaInsert, RoleSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/status.enum';
import { count, eq } from 'drizzle-orm';

// get all
export const getRole = query(async (): Promise<RoleSchema[]> => {
	const data = await db.select().from(table.roleTable);
	return data;
});

// get count
export const getRoleCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.roleTable);
	return row?.count ?? 0;
});

// get one
export const getRoleById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<RoleSchema | null> => {
		const [row] = await db
			.select()
			.from(table.roleTable)
			.where(eq(table.roleTable.id, id));
		return row ?? null;
	}
);

// create
export const createRole = command(
	'unchecked' as const,
	async (payload: RoleSchemaInsert): Promise<RoleSchema> => {
		const [row] = await db
			.insert(table.roleTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getRole().refresh();
		return row;
	}
);

// update
export const updateRole = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string | null; statusId?: number | null }): Promise<RoleSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.roleTable)
			.set(rest as RoleSchemaUpdate)
			.where(eq(table.roleTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getRole().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteRole = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.roleTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.roleTable.id, id));
		getRole().refresh();
	}
);

// delete complete (hard)
export const deleteRoleComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.roleTable).where(eq(table.roleTable.id, id));
		getRole().refresh();
	}
);
