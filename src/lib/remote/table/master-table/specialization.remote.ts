import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { SpecializationSchema, SpecializationSchemaInsert } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getSpecialization = query(async (): Promise<SpecializationSchema[]> => {
	const data = await db.select().from(table.specializationTable);
	return data;
});

// get count
export const getSpecializationCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.specializationTable);
	return row?.count ?? 0;
});

// get one
export const getSpecializationById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<SpecializationSchema | null> => {
		const [row] = await db
			.select()
			.from(table.specializationTable)
			.where(eq(table.specializationTable.id, id));
		return row ?? null;
	}
);

// create
export const createSpecialization = command(
	'unchecked' as const,
	async (payload: { name: string }): Promise<SpecializationSchema> => {
		const [row] = await db
			.insert(table.specializationTable)
			.values({ name: payload.name })
			.returning();
		if (!row) throw new Error('Insert failed');
		getSpecialization().refresh();
		return row;
	}
);

// update
export const updateSpecialization = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string }): Promise<SpecializationSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.specializationTable)
			.set(rest as Partial<SpecializationSchemaInsert>)
			.where(eq(table.specializationTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getSpecialization().refresh();
		return row;
	}
);

// delete (no status_id: hard delete)
export const deleteSpecialization = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.specializationTable).where(eq(table.specializationTable.id, id));
		getSpecialization().refresh();
	}
);

// delete complete (hard)
export const deleteSpecializationComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.specializationTable).where(eq(table.specializationTable.id, id));
		getSpecialization().refresh();
	}
);
