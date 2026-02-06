import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	NationalitySchema,
	NationalitySchemaInsert,
	NationalitySchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getNationality = query(async (): Promise<NationalitySchema[]> => {
	const data = await db.select().from(table.nationalityTable);
	return data;
});

// get count
export const getNationalityCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.nationalityTable);
	return row?.count ?? 0;
});

// get one
export const getNationalityById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<NationalitySchema | null> => {
		const [row] = await db
			.select()
			.from(table.nationalityTable)
			.where(eq(table.nationalityTable.id, id));
		return row ?? null;
	}
);

// create
export const createNationality = command(
	'unchecked' as const,
	async (payload: NationalitySchemaInsert): Promise<NationalitySchema> => {
		const [row] = await db
			.insert(table.nationalityTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getNationality().refresh();
		return row;
	}
);

// update
export const updateNationality = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string | null; statusId?: number | null }): Promise<NationalitySchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.nationalityTable)
			.set(rest as NationalitySchemaUpdate)
			.where(eq(table.nationalityTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getNationality().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteNationality = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.nationalityTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.nationalityTable.id, id));
		getNationality().refresh();
	}
);

// delete complete (hard)
export const deleteNationalityComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.nationalityTable).where(eq(table.nationalityTable.id, id));
		getNationality().refresh();
	}
);
