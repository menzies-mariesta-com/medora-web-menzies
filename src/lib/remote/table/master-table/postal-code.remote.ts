import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	PostalCodeSchema,
	PostalCodeSchemaInsert,
	PostalCodeSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getPostalCode = query(async (): Promise<PostalCodeSchema[]> => {
	const data = await ensureDb().select().from(table.postalCodeTable);
	return data;
});

// get count
export const getPostalCodeCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.postalCodeTable);
	return row?.count ?? 0;
});

// get one
export const getPostalCodeById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<PostalCodeSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.postalCodeTable)
			.where(eq(table.postalCodeTable.id, id));
		return row ?? null;
	}
);

// create
export const createPostalCode = command(
	'unchecked' as const,
	async (payload: PostalCodeSchemaInsert): Promise<PostalCodeSchema> => {
		const [row] = await ensureDb()
			.insert(table.postalCodeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getPostalCode().refresh();
		return row;
	}
);

// update
export const updatePostalCode = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		value?: number;
		cityId?: number;
		statusId?: number | null;
	}): Promise<PostalCodeSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.postalCodeTable)
			.set(rest as PostalCodeSchemaUpdate)
			.where(eq(table.postalCodeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getPostalCode().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deletePostalCode = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.postalCodeTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.postalCodeTable.id, id));
		getPostalCode().refresh();
	}
);

// delete complete (hard)
export const deletePostalCodeComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.postalCodeTable).where(eq(table.postalCodeTable.id, id));
		getPostalCode().refresh();
	}
);
