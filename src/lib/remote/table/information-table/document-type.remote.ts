import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DocumentTypeSchema,
	DocumentTypeSchemaInsert,
	DocumentTypeSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { and, count, desc, eq, ne } from 'drizzle-orm';

export const getDocumentTypes = query(
	async (): Promise<DocumentTypeSchema[]> => {
		return ensureDb()
			.select()
			.from(table.documentTypeTable)
			.where(ne(table.documentTypeTable.statusId, StatusEnum.DELETED))
			.orderBy(table.documentTypeTable.documentType);
	}
);

export const getDocumentTypeCount = query(
	async (): Promise<number> => {
		const [row] = await ensureDb()
			.select({ count: count() })
			.from(table.documentTypeTable)
			.where(
				ne(table.documentTypeTable.statusId, StatusEnum.DELETED)
			);
		return row?.count ?? 0;
	}
);

export const getDocumentTypesPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & { statusId?: number | null }
	): Promise<PaginatedResult<DocumentTypeSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.documentTypeTable.statusId,
			StatusEnum.DELETED
		);
		const statusFilter =
			params?.statusId != null
				? eq(table.documentTypeTable.statusId, params.statusId)
				: null;
		const whereExpr =
			statusFilter != null
				? and(notDeletedFilter, statusFilter)
				: notDeletedFilter;
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.documentTypeTable)
				.where(whereExpr)
				.orderBy(desc(table.documentTypeTable.createdAt))
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.documentTypeTable)
				.where(whereExpr)
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

export const getDocumentTypeById = query(
	'unchecked' as const,
	async ({
		id
	}: {
		id: number;
	}): Promise<DocumentTypeSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.documentTypeTable)
			.where(
				and(
					eq(table.documentTypeTable.id, id),
					ne(table.documentTypeTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

export const createDocumentType = command(
	'unchecked' as const,
	async (
		payload: DocumentTypeSchemaInsert
	): Promise<DocumentTypeSchema> => {
		const [row] = await ensureDb()
			.insert(table.documentTypeTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getDocumentTypes().refresh();
		return row;
	}
);

export const updateDocumentType = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		documentType?: string | null;
		statusId?: number | null;
	}): Promise<DocumentTypeSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.documentTypeTable)
			.set(rest as DocumentTypeSchemaUpdate)
			.where(eq(table.documentTypeTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getDocumentTypes().refresh();
		return row;
	}
);

export const deleteDocumentType = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.documentTypeTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.documentTypeTable.id, id));
		getDocumentTypes().refresh();
	}
);
