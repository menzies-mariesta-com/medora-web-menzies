import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { BloodTypeSchema, BloodTypeSchemaInsert, BloodTypeSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import { count, eq } from 'drizzle-orm';

// get all
export const getBloodType = query(async (): Promise<BloodTypeSchema[]> => {
  const data = await db.select().from(table.bloodTypeTable);
  return data;
});

// get count
export const getBloodTypeCount = query(async (): Promise<number> => {
  const [row] = await db.select({ count: count() }).from(table.bloodTypeTable);
  return row?.count ?? 0;
});

// get one
export const getBloodTypeById = query(
  'unchecked' as const,
  async ({ id }: { id: number }): Promise<BloodTypeSchema | null> => {
    const [row] = await db
      .select()
      .from(table.bloodTypeTable)
      .where(eq(table.bloodTypeTable.id, id));
    return row ?? null;
  }
);

// create
export const createBloodType = command(
  'unchecked' as const,
  async (payload: BloodTypeSchemaInsert): Promise<BloodTypeSchema> => {
    const [row] = await db
      .insert(table.bloodTypeTable)
      .values(payload)
      .returning();
    if (!row) throw new Error('Insert failed');
    getBloodType().refresh();
    return row;
  }
);

// update
export const updateBloodType = command(
  'unchecked' as const,
  async (payload: {
    id: number;
    name?: string;
    statusId?: number;
  }): Promise<BloodTypeSchema> => {
    const { id, ...rest } = payload;
    const [row] = await db
      .update(table.bloodTypeTable)
      .set(rest as BloodTypeSchemaUpdate)
      .where(eq(table.bloodTypeTable.id, id))
      .returning();
    if (!row) throw new Error('Update failed');
    getBloodType().refresh();
    return row;
  }
);

// delete (soft: set status to DELETED)
export const deleteBloodType = command(
  'unchecked' as const,
  async ({ id }: { id: number }): Promise<void> => {
    await db
      .update(table.bloodTypeTable)
      .set({ statusId: StatusEnum.DELETED })
      .where(eq(table.bloodTypeTable.id, id));
    getBloodType().refresh();
  }
);

// delete complete (hard)
export const deleteBloodTypeComplete = command(
  'unchecked' as const,
  async ({ id }: { id: number }): Promise<void> => {
    await db.delete(table.bloodTypeTable).where(eq(table.bloodTypeTable.id, id));
    getBloodType().refresh();
  }
);
