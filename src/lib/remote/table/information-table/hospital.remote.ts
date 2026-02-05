import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { HospitalSchema, HospitalSchemaInsert, HospitalSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getHospital = query(async (): Promise<HospitalSchema[]> => {
	const data = await db.select().from(table.hospitalTable);
	return data;
});

// get count
export const getHospitalCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.hospitalTable);
	return row?.count ?? 0;
});

// get one
export const getHospitalById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<HospitalSchema | null> => {
		const [row] = await db
			.select()
			.from(table.hospitalTable)
			.where(eq(table.hospitalTable.id, id));
		return row ?? null;
	}
);

// create
export const createHospital = command(
	'unchecked' as const,
	async (payload: HospitalSchemaInsert): Promise<HospitalSchema> => {
		const [row] = await db
			.insert(table.hospitalTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getHospital().refresh();
		return row;
	}
);

// update
export const updateHospital = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		name?: string | null;
		code?: string | null;
		statusId?: number | null;
	}): Promise<HospitalSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.hospitalTable)
			.set(rest as HospitalSchemaUpdate)
			.where(eq(table.hospitalTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getHospital().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteHospital = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.hospitalTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.hospitalTable.id, id));
		getHospital().refresh();
	}
);

// delete complete (hard)
export const deleteHospitalComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.hospitalTable).where(eq(table.hospitalTable.id, id));
		getHospital().refresh();
	}
);
