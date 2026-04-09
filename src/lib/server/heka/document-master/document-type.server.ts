import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, ne } from 'drizzle-orm';
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
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';

function requireUser(event: RequestEvent): void {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
}

export async function getDocumentTypes(
	event: RequestEvent,
	opts?: { hospitalId?: string }
): Promise<DocumentTypeSchema[]> {
	requireUser(event);
	if (opts?.hospitalId) await ensureCanAccessHospital(event, opts.hospitalId);
	return ensureDb()
		.select()
		.from(table.documentTypeTable)
		.where(ne(table.documentTypeTable.statusId, StatusEnum.DELETED))
		.orderBy(table.documentTypeTable.documentType);
}

export async function getDocumentTypesPaginated(
	event: RequestEvent,
	params?: PaginationParams & { statusId?: number | null; hospitalId?: string }
): Promise<PaginatedResult<DocumentTypeSchema>> {
	requireUser(event);
	if (params?.hospitalId)
		await ensureCanAccessHospital(event, params.hospitalId);

	const { page, pageSize, limit, offset } = normalizePagination(params);
	const notDeletedFilter = ne(
		table.documentTypeTable.statusId,
		StatusEnum.DELETED
	);
	const statusFilter =
		params?.statusId != null
			? eq(table.documentTypeTable.statusId, params.statusId)
			: null;
	const whereExpr =
		statusFilter != null ? and(notDeletedFilter, statusFilter) : notDeletedFilter;

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

export async function createDocumentType(
	event: RequestEvent,
	input: DocumentTypeSchemaInsert & { hospitalId?: string }
): Promise<DocumentTypeSchema> {
	requireUser(event);
	if (input.hospitalId) await ensureCanAccessHospital(event, input.hospitalId);

	const { hospitalId: _hospitalId, ...payload } = input;
	const [row] = await ensureDb()
		.insert(table.documentTypeTable)
		.values(payload)
		.returning();
	if (!row) throw error(500, 'Insert failed');
	return row;
}

export async function updateDocumentType(
	event: RequestEvent,
	payload: DocumentTypeSchemaUpdate & {
		id: number;
		hospitalId?: string;
	}
): Promise<DocumentTypeSchema> {
	requireUser(event);
	if (payload.hospitalId)
		await ensureCanAccessHospital(event, payload.hospitalId);

	const { id, hospitalId: _hospitalId, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.documentTypeTable)
		.set(rest)
		.where(eq(table.documentTypeTable.id, id))
		.returning();
	if (!row) throw error(500, 'Update failed');
	return row;
}

export async function deleteDocumentType(
	event: RequestEvent,
	{ id, hospitalId }: { id: number; hospitalId?: string }
): Promise<void> {
	requireUser(event);
	if (hospitalId) await ensureCanAccessHospital(event, hospitalId);
	await ensureDb()
		.update(table.documentTypeTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.documentTypeTable.id, id));
}

