import { query, command } from '$app/server';
import { db } from '$lib/server/db';
import type { SimpleCrud, SimpleCrudInsert } from '$lib/server/db/schema';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// get all
export const getSimpleCrud = query(async (): Promise<SimpleCrud[]> => {
  const data = await db.select().from(table.simpleCrud);
  return data;
});

// get one
export const getSimpleCrudById = query(
  'unchecked' as const,
  async ({ id }: { id: string }): Promise<SimpleCrud | null> => {
    const [row] = await db
      .select()
      .from(table.simpleCrud)
      .where(eq(table.simpleCrud.id, id));
    return row ?? null;
  }
);

// create
export const createSimpleCrud = command(
  'unchecked' as const,
  async (payload: { name: string; description?: string | null }): Promise<SimpleCrud> => {
    const [row] = await db
      .insert(table.simpleCrud)
      .values({ name: payload.name, description: payload.description ?? null })
      .returning();
    if (!row) throw new Error('Insert failed');
    getSimpleCrud().refresh();
    return row;
  }
);

// update
export const updateSimpleCrud = command(
  'unchecked' as const,
  async (payload: {
    id: string;
    name?: string;
    description?: string | null;
  }): Promise<SimpleCrud> => {
    const { id, ...rest } = payload;
    const [row] = await db
      .update(table.simpleCrud)
      .set(rest as Partial<SimpleCrudInsert>)
      .where(eq(table.simpleCrud.id, id))
      .returning();
    if (!row) throw new Error('Update failed');
    getSimpleCrud().refresh();
    return row;
  }
);

// delete
export const deleteSimpleCrud = command(
  'unchecked' as const,
  async ({ id }: { id: string }): Promise<void> => {
    await db.delete(table.simpleCrud).where(eq(table.simpleCrud.id, id));
    getSimpleCrud().refresh();
  }
);
