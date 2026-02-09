import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { BloodTypeSchema, BloodTypeSchemaInsert, BloodTypeSchemaUpdate } from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getBloodType = query(async (): Promise<BloodTypeSchema[]> => {
  const data = await ensureDb().select().from(table.bloodTypeTable);
  return data;
});

// get count
export const getBloodTypeCount = query(async (): Promise<number> => {
  const [row] = await ensureDb().select({ count: count() }).from(table.bloodTypeTable);
  return row?.count ?? 0;
});

// get paginated
export const getBloodTypePaginated = query(
  'unchecked' as const,
  async (params?: PaginationParams): Promise<PaginatedResult<BloodTypeSchema>> => {
    const { page, pageSize, limit, offset } = normalizePagination(params);
    const [data, countResult] = await Promise.all([
      ensureDb().select().from(table.bloodTypeTable).limit(limit).offset(offset),
      ensureDb().select({ count: count() }).from(table.bloodTypeTable),
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
export const getBloodTypeById = query(
  'unchecked' as const,
  async ({ id }: { id: number }): Promise<BloodTypeSchema | null> => {
    const [row] = await ensureDb()
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
    const [row] = await ensureDb()
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
    const [row] = await ensureDb()
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
    await ensureDb()
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
    await ensureDb().delete(table.bloodTypeTable).where(eq(table.bloodTypeTable.id, id));
    getBloodType().refresh();
  }
);
