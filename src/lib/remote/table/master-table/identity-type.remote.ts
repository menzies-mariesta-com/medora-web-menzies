import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { IdentityTypeSchema, IdentityTypeSchemaInsert, IdentityTypeSchemaUpdate } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getIdentityType = query(async (): Promise<IdentityTypeSchema[]> => {
	const data = await db.select().from(table.identityTypeTable);
	return data;
});

// get count
export const getIdentityTypeCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.identityTypeTable);
	return row?.count ?? 0;
});

// get one
export const getIdentityTypeById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<IdentityTypeSchema | null> => {
		const [row] = await db
			.select()
			.from(table.identityTypeTable)
			.where(eq(table.identityTypeTable.id, id));
		return row ?? null;
	}
);

// create
export const createIdentityType = command(
	'unchecked' as const,
	async (payload: IdentityTypeSchemaInsert): Promise<IdentityTypeSchema> => {
		const [row] = await db
			.insert(table.identityTypeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getIdentityType().refresh();
		return row;
	}
);

// update
export const updateIdentityType = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string }): Promise<IdentityTypeSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.identityTypeTable)
			.set(rest as IdentityTypeSchemaUpdate)
			.where(eq(table.identityTypeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getIdentityType().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deleteIdentityType = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.identityTypeTable).where(eq(table.identityTypeTable.id, id));
		getIdentityType().refresh();
	}
);

// delete complete (hard)
export const deleteIdentityTypeComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.identityTypeTable).where(eq(table.identityTypeTable.id, id));
		getIdentityType().refresh();
	}
);
