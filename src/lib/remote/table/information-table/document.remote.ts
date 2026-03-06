import { query } from '$app/server';
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
	async ({
		id
	}: {
		id: number;
	}): Promise<DocumentSchema | null> => {
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
		const [data, countResult] = await Promise.all([
			ensureDb()
				.select()
				.from(table.documentTable)
				.limit(limit)
				.offset(offset),
			ensureDb()
				.select({ count: count() })
				.from(table.documentTable)
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

