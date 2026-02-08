import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StatusTaggingSchema,
	StatusTaggingSchemaInsert,
	StatusTaggingSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getStatusTagging = query(async (): Promise<StatusTaggingSchema[]> => {
	const data = await ensureDb().select().from(table.statusTaggingTable);
	return data;
});

// get all with relations
export const getStatusTaggingWithRelations = query(async () => {
	return ensureDb().query.statusTaggingTable.findMany({
		with: {
			statusTaggingType: true,
			status: true,
		},
	});
});

// get count
export const getStatusTaggingCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.statusTaggingTable);
	return row?.count ?? 0;
});

// get one
export const getStatusTaggingById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StatusTaggingSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.statusTaggingTable)
			.where(eq(table.statusTaggingTable.id, id));
		return row ?? null;
	}
);

// create
export const createStatusTagging = command(
	'unchecked' as const,
	async (payload: StatusTaggingSchemaInsert): Promise<StatusTaggingSchema> => {
		const [row] = await ensureDb()
			.insert(table.statusTaggingTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStatusTagging().refresh();
		return row;
	}
);

// update
export const updateStatusTagging = command(
	'unchecked' as const,
	async (payload: { id: number } & StatusTaggingSchemaUpdate): Promise<StatusTaggingSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.statusTaggingTable)
			.set(rest as StatusTaggingSchemaUpdate)
			.where(eq(table.statusTaggingTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStatusTagging().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteStatusTagging = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.statusTaggingTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.statusTaggingTable.id, id));
		getStatusTagging().refresh();
	}
);

// delete complete (hard)
export const deleteStatusTaggingComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb().delete(table.statusTaggingTable).where(eq(table.statusTaggingTable.id, id));
		getStatusTagging().refresh();
	}
);
