import { error, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { AdminPageKeyEnum } from '$lib/model/enum/db-link';
import type { PaginationParams } from '$lib/model/type/pagination.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { DocumentSchemaUpdate } from '$lib/server/db/schema-type';
import { getDocumentsPaginatedWithRelations } from '$lib/server/medora/document-master/document.server';
import { requireAdminPagePermission } from '$lib/server/medora/admin/admin-permission.server';

export async function listAdminGlobalDocuments(
	event: RequestEvent,
	params?: PaginationParams & { statusId?: number | null }
) {
	await requireAdminPagePermission(
		event,
		AdminPageKeyEnum.GLOBAL_DOCUMENTS,
		'view'
	);
	return getDocumentsPaginatedWithRelations(event, {
		...params,
		hospitalId: undefined
	});
}

export async function updateAdminGlobalDocument(
	event: RequestEvent,
	payload: DocumentSchemaUpdate & { id: number }
) {
	await requireAdminPagePermission(
		event,
		AdminPageKeyEnum.GLOBAL_DOCUMENTS,
		'edit'
	);
	const { id, ...rest } = payload;
	if (!Number.isFinite(id) || id <= 0) throw error(400, 'Invalid id');
	const [row] = await ensureDb()
		.update(table.documentTable)
		.set(rest)
		.where(eq(table.documentTable.id, id))
		.returning();
	if (!row) throw error(404, 'Document not found');
	return row;
}

export async function reseedAdminGlobalDocuments(event: RequestEvent) {
	await requireAdminPagePermission(
		event,
		AdminPageKeyEnum.GLOBAL_DOCUMENTS,
		'edit'
	);
	const { seedGlobalDocumentsFromCatalog } = await import(
		'$lib/server/medora/document-master/provision-templates.server'
	);
	return seedGlobalDocumentsFromCatalog(ensureDb(), 'en');
}
