import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StaffDetailSchema,
	StaffDetailSchemaInsert,
	StaffDetailSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getStaffDetail = query(async (): Promise<StaffDetailSchema[]> => {
	const data = await db.select().from(table.staffDetailTable);
	return data;
});

// get all with relations
export const getStaffDetailWithRelations = query(async () => {
	return db.query.staffDetailTable.findMany({
		with: {
			bloodType: true,
			status: true,
		},
	});
});

// get count
export const getStaffDetailCount = query(async (): Promise<number> => {
	const [row] = await db.select({ count: count() }).from(table.staffDetailTable);
	return row?.count ?? 0;
});

// get one
export const getStaffDetailById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StaffDetailSchema | null> => {
		const [row] = await db
			.select()
			.from(table.staffDetailTable)
			.where(eq(table.staffDetailTable.id, id));
		return row ?? null;
	}
);

// get one with relations
export const getStaffDetailByIdWithRelations = query(
	'unchecked' as const,
	async ({ id }: { id: number }) => {
		return db.query.staffDetailTable.findFirst({
			where: (t, { eq }) => eq(t.id, id),
			with: {
				bloodType: true,
				status: true,
			},
		});
	}
);

// create
export const createStaffDetail = command(
	'unchecked' as const,
	async (payload: StaffDetailSchemaInsert): Promise<StaffDetailSchema> => {
		const [row] = await db
			.insert(table.staffDetailTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getStaffDetail().refresh();
		return row;
	}
);

// update
export const updateStaffDetail = command(
	'unchecked' as const,
	async (payload: { id: number } & StaffDetailSchemaUpdate): Promise<StaffDetailSchema> => {
		const { id, ...rest } = payload;
		const [row] = await db
			.update(table.staffDetailTable)
			.set(rest as StaffDetailSchemaUpdate)
			.where(eq(table.staffDetailTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getStaffDetail().refresh();
		return row;
	}
);

// delete (soft: set status to DELETED)
export const deleteStaffDetail = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db
			.update(table.staffDetailTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.staffDetailTable.id, id));
		getStaffDetail().refresh();
	}
);

// delete complete (hard)
export const deleteStaffDetailComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await db.delete(table.staffDetailTable).where(eq(table.staffDetailTable.id, id));
		getStaffDetail().refresh();
	}
);
