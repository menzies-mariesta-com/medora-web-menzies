import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { StaffTypeSchema, StaffTypeSchemaInsert, StaffTypeSchemaUpdate } from '$lib/server/db/schema-type';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getStaffType = query(async (): Promise<StaffTypeSchema[]> => {
  const data = await ensureDb().select().from(table.staffTypeTable);
  return data;
});

// get count
export const getStaffTypeCount = query(async (): Promise<number> => {
  const [row] = await ensureDb().select({ count: count() }).from(table.staffTypeTable);
  return row?.count ?? 0;
});

// get paginated
export const getStaffTypePaginated = query(
  'unchecked' as const,
  async (params?: PaginationParams): Promise<PaginatedResult<StaffTypeSchema>> => {
    const { page, pageSize, limit, offset } = normalizePagination(params);
    const [data, countResult] = await Promise.all([
      ensureDb().select().from(table.staffTypeTable).limit(limit).offset(offset),
      ensureDb().select({ count: count() }).from(table.staffTypeTable),
    ]);
    const total = countResult[0]?.count ?? 0;
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }
);

// get one
export const getStaffTypeById = query(
  'unchecked' as const,
  async ({ id }: { id: number }): Promise<StaffTypeSchema | null> => {
    const [row] = await ensureDb()
      .select()
      .from(table.staffTypeTable)
      .where(eq(table.staffTypeTable.id, id));
    return row ?? null;
  }
);

// create
export const createStaffType = command(
  'unchecked' as const,
  async (payload: StaffTypeSchemaInsert): Promise<StaffTypeSchema> => {
    const [row] = await ensureDb()
      .insert(table.staffTypeTable)
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
    const [row] = await ensureDb()
      .update(table.staffTypeTable)
      .set(rest as StaffTypeSchemaUpdate)
      .where(eq(table.staffTypeTable.id, id))
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
    await ensureDb().delete(table.staffTypeTable).where(eq(table.staffTypeTable.id, id));
    getStaffType().refresh();
  }
);

// delete complete (hard)
export const deleteStaffTypeComplete = command(
  'unchecked' as const,
  async ({ id }: { id: number }): Promise<void> => {
    await ensureDb().delete(table.staffTypeTable).where(eq(table.staffTypeTable.id, id));
    getStaffType().refresh();
  }
);
