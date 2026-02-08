import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { CraftGroupSchema, CraftGroupSchemaInsert, CraftGroupSchemaUpdate } from '$lib/server/db/schema-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getCraftGroup = query(async (): Promise<CraftGroupSchema[]> => {
  const data = await ensureDb().select().from(table.craftGroupTable);
  return data;
});

// get count
export const getCraftGroupCount = query(async (): Promise<number> => {
  const [row] = await ensureDb().select({ count: count() }).from(table.craftGroupTable);
  return row?.count ?? 0;
});

// get one
export const getCraftGroupById = query(
  'unchecked' as const,
  async ({ id }: { id: number }): Promise<CraftGroupSchema | null> => {
    const [row] = await ensureDb()
      .select()
      .from(table.craftGroupTable)
      .where(eq(table.craftGroupTable.id, id));
    return row ?? null;
  }
);

// create
export const createCraftGroup = command(
  'unchecked' as const,
  async (payload: CraftGroupSchemaInsert): Promise<CraftGroupSchema> => {
    const [row] = await ensureDb()
      .insert(table.craftGroupTable)
      .values(payload)
      .returning();
    if (!row) throw new Error('Insert failed');
    getCraftGroup().refresh();
    return row;
  }
);

// update
export const updateCraftGroup = command(
  'unchecked' as const,
  async (payload: { id: number; name?: string }): Promise<CraftGroupSchema> => {
    const { id, ...rest } = payload;
    const [row] = await ensureDb()
      .update(table.craftGroupTable)
      .set(rest as CraftGroupSchemaUpdate)
      .where(eq(table.craftGroupTable.id, id))
      .returning();
    if (!row) throw new Error('Update failed');
    getCraftGroup().refresh();
    return row;
  }
);

// delete (no status_id: hard delete)
export const deleteCraftGroup = command(
  'unchecked' as const,
  async ({ id }: { id: number }): Promise<void> => {
    await ensureDb().delete(table.craftGroupTable).where(eq(table.craftGroupTable.id, id));
    getCraftGroup().refresh();
  }
);

// delete complete (hard)
export const deleteCraftGroupComplete = command(
  'unchecked' as const,
  async ({ id }: { id: number }): Promise<void> => {
    await ensureDb().delete(table.craftGroupTable).where(eq(table.craftGroupTable.id, id));
    getCraftGroup().refresh();
  }
);
