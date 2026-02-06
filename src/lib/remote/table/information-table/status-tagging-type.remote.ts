import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StatusTaggingTypeSchema,
	StatusTaggingTypeSchemaInsert,
	StatusTaggingTypeSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getStatusTaggingType = query(async (): Promise<StatusTaggingTypeSchema[]> => {
	const data = await db.select().from(table.statusTaggingTypeTable);
	return data;
});

// get all with relations
export const getStatusTaggingTypeWithRelations = query(async () => {
	return db.query.statusTaggingTypeTable.findMany({
		with: {
			status: true,
		},
	});
});

// get count
export const getStatusTaggingTypeCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.statusTaggingTypeTable);
	return row?.count ?? 0;
});

// get one
export const getStatusTaggingTypeById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StatusTaggingTypeSchema | null> => {
		const [row] = await db
			.select()
			.from(table.statusTaggingTypeTable)
			.where(eq(table.statusTaggingTypeTable.id, id));
		return row ?? null;
	}
);

// create
export const createStatusTaggingType = command(
	'unchecked' as const,
	async (payload: StatusTaggingTypeSchemaInsert): Promise<StatusTaggingTypeSchema> => {
		const [row] = await db
			.insert(table.statusTaggingTypeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStatusTaggingType().refresh();
		return row;
	}
);

// update
export const updateStatusTaggingType = command(
	'unchecked' as const,
	async (payload: { id: number; name?: string | null; statusId?: number | null }): Promise<StatusTaggingTypeSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.statusTaggingTypeTable)
			.set(rest as StatusTaggingTypeSchemaUpdate)
			.where(eq(table.statusTaggingTypeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStatusTaggingType().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteStatusTaggingType = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.statusTaggingTypeTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.statusTaggingTypeTable.id, id));
		getStatusTaggingType().refresh();
	}
);

// delete complete (hard)
export const deleteStatusTaggingTypeComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.statusTaggingTypeTable).where(eq(table.statusTaggingTypeTable.id, id));
		getStatusTaggingType().refresh();
	}
);
