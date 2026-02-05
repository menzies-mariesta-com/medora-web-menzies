import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StaffTypeSchema, StaffTypeSchemaInsert, StaffTypeSchemaUpdate } from '$lib/server/db/schema-type';

import { count, eq } from 'drizzle-orm';

// get all
export const getStaffType = query(async (): Promise<StaffTypeSchema[]> => {
  const data = await db.select().from(table.craftGroupTable);
  return data;
});

// get count
export const getStaffTypeCount = query(async (): Promise<number> => {
  const [row] = await db.select({ count: count() }).from(table.craftGroupTable);
  return row?.count ?? 0;
});

// get one
export const getStaffTypeById = query(
  'unchecked' as const,
  async ({ id }: { id: number }): Promise<StaffTypeSchema | null> => {
    const [row] = await db
      .select()
      .from(table.craftGroupTable)
      .where(eq(table.craftGroupTable.id, id));
    return row ?? null;
  }
);

// create
export const createStaffType = command(
  'unchecked' as const,
  async (payload: StaffTypeSchemaInsert): Promise<StaffTypeSchema> => {
    const [row] = await db
      .insert(table.craftGroupTable)
      .values(payload)
      .returning();
    if (!row) throw new Error('Insert failed');
    getStaffType().refresh();
    return row;
  }
);

// update
export const updateStaffType = command(
  'unchecked' as const,
  async (payload: { id: number; name?: string }): Promise<StaffTypeSchema> => {
    const { id, ...rest } = payload;
    const [row] = await db
      .update(table.craftGroupTable)
      .set(rest as StaffTypeSchemaUpdate)
      .where(eq(table.craftGroupTable.id, id))
      .returning();
    if (!row) throw new Error('Update failed');
    getStaffType().refresh();
    return row;
  }
);

// delete (no status_id: hard delete)
export const deleteStaffType = command(
  'unchecked' as const,
  async ({ id }: { id: number }): Promise<void> => {
    await db.delete(table.craftGroupTable).where(eq(table.craftGroupTable.id, id));
    getStaffType().refresh();
  }
);

// delete complete (hard)
export const deleteStaffTypeComplete = command(
  'unchecked' as const,
  async ({ id }: { id: number }): Promise<void> => {
    await db.delete(table.craftGroupTable).where(eq(table.craftGroupTable.id, id));
    getStaffType().refresh();
  }
);
