import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	StatusTaggingTypeSchema,
	StatusTaggingTypeSchemaInsert,
	StatusTaggingTypeSchemaUpdate,
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getStatusTaggingType = query(async (): Promise<StatusTaggingTypeSchema[]> => {
	const data = await ensureDb().select().from(table.statusTaggingTypeTable);
	return data;
});

// get all with relations
export const getStatusTaggingTypeWithRelations = query(async () => {
	return ensureDb().query.statusTaggingTypeTable.findMany({
		with: {
			status: true,
		},
	});
});

// get count
export const getStatusTaggingTypeCount = query(async (): Promise<number> => {
	const [row] = await ensureDb().select({ count: count() }).from(table.statusTaggingTypeTable);
	return row?.count ?? 0;
});

// get paginated
export const getStatusTaggingTypePaginated = query(
	'unchecked' as const,
	async (params?: PaginationParams): Promise<PaginatedResult<StatusTaggingTypeSchema>> => {
		const { page, pageSize, limit, offset } = normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb().select().from(table.statusTaggingTypeTable).limit(limit).offset(offset),
			ensureDb().select({ count: count() }).from(table.statusTaggingTypeTable),
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
export const getStatusTaggingTypeById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<StatusTaggingTypeSchema | null> => {
		const [row] = await ensureDb()
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
		const [row] = await ensureDb()
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
		const [row] = await ensureDb()
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
		await ensureDb()
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
		await ensureDb().delete(table.statusTaggingTypeTable).where(eq(table.statusTaggingTypeTable.id, id));
		getStatusTaggingType().refresh();
	}
);
