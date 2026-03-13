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
import { eq, count } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';

// get all documents
export const getDocuments = query(
	async (): Promise<DocumentSchema[]> => {
		return ensureDb().select().from(table.documentTable);
	}
);

// get all with relations (document_type)
export const getDocumentsWithRelations = query(async () => {
	return ensureDb().query.documentTable.findMany({
		with: {
			documentType: true,
			status: true,
			patientDocuments: true
		}
	});
});

export type DocumentWithRelations = Awaited<
	ReturnType<typeof getDocumentsWithRelations>
>[number];

// get one by id
export const getDocumentById = query(
	'unchecked' as const,
	async ({ id }: { id: number }): Promise<DocumentSchema | null> => {
		const [row] = await ensureDb()
			.select()
			.from(table.documentTable)
			.where(eq(table.documentTable.id, id));
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
		const activeFilter = eq(
			table.documentTable.statusId,
			StatusEnum.ACTIVE
		);
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.documentTable)
				.where(activeFilter)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.documentTable)
				.where(activeFilter)
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
		params?: PaginationParams
	): Promise<PaginatedResult<DocumentWithRelations>> => {
		const { page, pageSize, limit, offset } =
			normalizePagination(params);
		const activeFilter = eq(
			table.documentTable.statusId,
			StatusEnum.ACTIVE
		);
		const [data, countResult] = await Promise.all([
			ensureDb().query.documentTable.findMany({
				where: activeFilter,
				with: {
					documentType: true,
					status: true
				},
				limit,
				offset
			}),
			ensureDb()
				.select({ count: count() })
				.from(table.documentTable)
				.where(activeFilter)
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
