import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, eq, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DocumentSchema,
	DocumentSchemaInsert,
	DocumentSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import { assertDocumentSettingAccessible } from '$lib/server/heka/document-master/document-setting.server';

const documentWithRelationsWith = {
	documentType: true,
	documentSetting: true,
	status: true,
	patientDocuments: true
} as const;

export type DocumentWithRelations = Awaited<
	ReturnType<typeof getDocumentsWithRelations>
>[number];

function requireUser(event: RequestEvent): void {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
}

export async function getDocumentsWithRelations(
	event: RequestEvent,
	opts?: { hospitalId?: string }
) {
	requireUser(event);
	if (opts?.hospitalId)
		await ensureCanAccessHospital(event, opts.hospitalId);
	return ensureDb().query.documentTable.findMany({
		where: ne(table.documentTable.statusId, StatusEnum.DELETED),
		with: documentWithRelationsWith
	});
}

export async function getDocumentByCode(
	event: RequestEvent,
	code: string
): Promise<DocumentWithRelations | null> {
	requireUser(event);
	const trimmed = code.trim();
	if (!trimmed) return null;

	const row = await ensureDb().query.documentTable.findFirst({
		where: and(
			eq(table.documentTable.code, trimmed),
			ne(table.documentTable.statusId, StatusEnum.DELETED)
		),
		with: documentWithRelationsWith
	});
	return row ?? null;
}

export async function getDocumentsPaginatedWithRelations(
	event: RequestEvent,
	params?: PaginationParams & {
		statusId?: number | null;
		hospitalId?: string;
	}
): Promise<PaginatedResult<DocumentWithRelations>> {
	requireUser(event);
	if (params?.hospitalId)
		await ensureCanAccessHospital(event, params.hospitalId);

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
			with: documentWithRelationsWith,
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

async function validateDocumentSettingId(
	event: RequestEvent,
	hospitalId: string | undefined,
	documentSettingId: number | null | undefined
): Promise<number> {
	if (documentSettingId == null || Number.isNaN(documentSettingId)) {
		throw error(400, 'documentSettingId is required');
	}
	if (!hospitalId) {
		throw error(400, 'hospitalId is required to validate document setting');
	}
	await assertDocumentSettingAccessible(
		event,
		hospitalId,
		documentSettingId
	);
	return documentSettingId;
}

export async function createDocument(
	event: RequestEvent,
	payload: DocumentSchemaInsert & { hospitalId?: string }
): Promise<DocumentSchema> {
	requireUser(event);
	if (payload.hospitalId)
		await ensureCanAccessHospital(event, payload.hospitalId);

	const { hospitalId, ...data } = payload;
	const documentSettingId = await validateDocumentSettingId(
		event,
		hospitalId,
		data.documentSettingId
	);
	const [row] = await ensureDb()
		.insert(table.documentTable)
		.values({ ...data, documentSettingId })
		.returning();
	if (!row) throw error(500, 'Insert failed');
	return row;
}

export async function updateDocument(
	event: RequestEvent,
	payload: DocumentSchemaUpdate & { id: number; hospitalId?: string }
): Promise<DocumentSchema> {
	requireUser(event);
	if (payload.hospitalId)
		await ensureCanAccessHospital(event, payload.hospitalId);

	const { id, hospitalId, ...rest } = payload;
	if (rest.documentSettingId !== undefined) {
		rest.documentSettingId = await validateDocumentSettingId(
			event,
			hospitalId,
			rest.documentSettingId
		);
	}
	const [row] = await ensureDb()
		.update(table.documentTable)
		.set(rest)
		.where(eq(table.documentTable.id, id))
		.returning();
	if (!row) throw error(500, 'Update failed');
	return row;
}

export async function deleteDocument(
	event: RequestEvent,
	{ id, hospitalId }: { id: number; hospitalId?: string }
): Promise<void> {
	requireUser(event);
	if (hospitalId) await ensureCanAccessHospital(event, hospitalId);
	await ensureDb()
		.update(table.documentTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(eq(table.documentTable.id, id));
}
