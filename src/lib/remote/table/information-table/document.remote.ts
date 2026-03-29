import { query, command } from '$app/server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DocumentSchema,
	DocumentSchemaInsert,
	DocumentSchemaUpdate
} from '$lib/server/db/schema-type';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/remote/table/pagination-type';
import { normalizePagination } from '$lib/remote/table/pagination-type';
import { eq, count, ne, and } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';

// get all documents
export const getDocuments = query(
	async (): Promise<DocumentSchema[]> => {
		return ensureDb()
			.select()
			.from(table.documentTable)
			.where(ne(table.documentTable.statusId, StatusEnum.DELETED));
	}
);

// get all with relations (document_type)
export const getDocumentsWithRelations = query(async () => {
	return ensureDb().query.documentTable.findMany({
		where: ne(table.documentTable.statusId, StatusEnum.DELETED),
		with: {
			documentType: true,
			documentSetting: true,
			status: true,
			patientDocuments: true
		}
	});
});

export type DocumentWithRelations = Awaited<
	ReturnType<typeof getDocumentsWithRelations>
>[number];

/** System / seeded document for EMR print (e.g. nursing complete). */
export const getDocumentByCode = query(
	'unchecked' as const,
	async ({
		code
	}: {
		code: string;
	}): Promise<DocumentWithRelations | null> => {
		const trimmed = code.trim();
		if (!trimmed) return null;
		const row = await ensureDb().query.documentTable.findFirst({
			where: and(
				eq(table.documentTable.code, trimmed),
				ne(table.documentTable.statusId, StatusEnum.DELETED)
			),
			with: {
				documentType: true,
				documentSetting: true,
				status: true,
				patientDocuments: true
			}
		});
		return row ?? null;
	}
);

// get one by id
export const getDocumentById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<DocumentSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.documentTable)
			.where(
				and(
					eq(table.documentTable.id, id),
					ne(table.documentTable.statusId, StatusEnum.DELETED)
				)
			);
		return row ?? null;
	}
);

// get paginated
export const getDocumentsPaginated = query(
	'unchecked' as const,
	async (
		params?: PaginationParams
	): Promise<PaginatedResult<DocumentSchema>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.documentTable.statusId,
			StatusEnum.DELETED
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.documentTable)
				.where(notDeletedFilter)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.documentTable)
				.where(notDeletedFilter)
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

// get paginated with relations
export const getDocumentsPaginatedWithRelations = query(
	'unchecked' as const,
	async (
		params?: PaginationParams & { statusId?: number | null }
	): Promise<PaginatedResult<DocumentWithRelations>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const notDeletedFilter = ne(
			table.documentTable.statusId,
			StatusEnum.DELETED
		);
		const statusFilter =
			params?.statusId != null
				? eq(table.documentTable.statusId, params.statusId)
				: null;
		const whereExpr =
			statusFilter != null
				? and(notDeletedFilter, statusFilter)
				: notDeletedFilter;
		const [data, countResult] = await Promise.all([
			ensureDb().query.documentTable.findMany({
				where: whereExpr,
				with: {
					documentType: true,
					documentSetting: true,
					status: true,
					patientDocuments: true
				},
				orderBy: (t, { desc }) => desc(t.createdAt),
				limit,
				offset
			}),
			ensureDb()
				.select({ count: count() })
				.from(table.documentTable)
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

// create document
export const createDocument = command(
	'unchecked' as const,
	async (payload: DocumentSchemaInsert): Promise<DocumentSchema> => {
		const [row] = await ensureDb()
			.insert(table.documentTable)
			.values(payload)
			.returning();
		if (!row) throw new Error('Insert failed');
		getDocuments().refresh();
		return row;
	}
);

// update document
export const updateDocument = command(
	'unchecked' as const,
	async (payload: {
		id: number;
		documentTypeId?: number;
		documentSettingId?: number | null;
		code?: string | null;
		documentNumber?: string | null;
		documentText?: string | null;
		statusId?: number;
	}): Promise<DocumentSchema> => {
		const { id, ...rest } = payload;
		const [row] = await ensureDb()
			.update(table.documentTable)
			.set(rest as DocumentSchemaUpdate)
			.where(eq(table.documentTable.id, id))
			.returning();
		if (!row) throw new Error('Update failed');
		getDocuments().refresh();
		return row;
	}
);

// delete document (soft delete)
export const deleteDocument = command(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<void> => {
		await ensureDb()
			.update(table.documentTable)
			.set({ statusId: StatusEnum.DELETED })
			.where(eq(table.documentTable.id, id));
		getDocuments().refresh();
	}
);
