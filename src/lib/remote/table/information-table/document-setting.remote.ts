import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DocumentSettingSchema,
	DocumentSettingSchemaInsert,
	DocumentSettingSchemaUpdate
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { count, eq } from 'drizzle-orm';

// get all
export const getDocumentSettings = query(
	async (): Promise<DocumentSettingSchema[]> => {
		return ensureDb().select().from(table.documentSettingTable);
	}
);

// get count
export const getDocumentSettingsCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.documentSettingTable);
		return row?.count ?? 0;
	}
);

// get paginated
export const getDocumentSettingsPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<DocumentSettingSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.documentSettingTable)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.documentSettingTable)
		]);
		const total = countResult[0]?.count ?? 0;
		return {
			data,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize) || 1
		};
	}
);

// get one
export const getDocumentSettingById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<DocumentSettingSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.documentSettingTable)
			.where(eq(table.documentSettingTable.id, id));
		return row ?? null;
	}
);

// create
export const createDocumentSetting = command(
	'unchecked' as const,
	async (
		payload: DocumentSettingSchemaInsert
	): Promise<DocumentSettingSchema> => {
		const [row] = await ensureDb()
			.insert(table.documentSettingTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getDocumentSettings().refresh();
		getDocumentSettingsCount().refresh();
		getDocumentSettingsPaginated(undefined).refresh();
		return row;
	}
);

// update
export const updateDocumentSetting = command(
	'unchecked' as const,
	async (
		payload: DocumentSettingSchemaUpdate & { id: number }
	): Promise<DocumentSettingSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.documentSettingTable)
			.set(rest as DocumentSettingSchemaUpdate)
			.where(eq(table.documentSettingTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getDocumentSettings().refresh();
		getDocumentSettingsCount().refresh();
		getDocumentSettingsPaginated(undefined).refresh();
		return row;
	}
);

// delete (soft) - mark as deleted via status if using status enum
export const deleteDocumentSetting = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.documentSettingTable)
			.where(eq(table.documentSettingTable.id, id));
		getDocumentSettings().refresh();
		getDocumentSettingsCount().refresh();
		getDocumentSettingsPaginated(undefined).refresh();
	}
);

// delete complete (hard)
export const deleteDocumentSettingComplete = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.delete(table.documentSettingTable)
			.where(eq(table.documentSettingTable.id, id));
		getDocumentSettings().refresh();
		getDocumentSettingsCount().refresh();
		getDocumentSettingsPaginated(undefined).refresh();
	}
);

