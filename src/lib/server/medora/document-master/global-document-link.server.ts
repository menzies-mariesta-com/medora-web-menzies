import { error, type RequestEvent } from '@sveltejs/kit';
import { and, asc, count, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	GlobalDocumentLinkListResponse,
	GlobalDocumentLinkRow,
	GlobalDocumentPreview
} from '$lib/model/type/medora/global-document-link.type';
import {
	normalizePagination,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { assertDocumentSettingAccessible } from '$lib/server/medora/document-master/document-setting.server';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { paginatedEntityStatusEq } from '$lib/server/medora/paginated-entity-status-filter.server';

function requireUser(event: RequestEvent): void {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
}

export async function listGlobalDocumentsForHospitalLink(
	event: RequestEvent,
	hospitalId: string,
	params?: PaginationParams & { statusId?: number | null }
): Promise<GlobalDocumentLinkListResponse> {
	requireUser(event);
	await ensureCanAccessHospital(event, hospitalId);

	const { page, pageSize, limit, offset } = normalizePagination(params);
	const whereExpr = and(
		paginatedEntityStatusEq(table.documentTable.statusId, params?.statusId),
		ne(table.documentTable.statusId, StatusEnum.DELETED)
	);

	const db = ensureDb();
	const [{ total }] = await db
		.select({ total: count() })
		.from(table.documentTable)
		.where(whereExpr);

	const rows = await db
		.select({
			document: table.documentTable,
			linkId: table.hospitalDocumentTable.id,
			linkTypeId: table.hospitalDocumentTable.documentTypeId,
			linkSettingId: table.hospitalDocumentTable.documentSettingId
		})
		.from(table.documentTable)
		.leftJoin(
			table.hospitalDocumentTable,
			and(
				eq(
					table.hospitalDocumentTable.documentId,
					table.documentTable.id
				),
				eq(table.hospitalDocumentTable.hospitalId, hospitalId)
			)
		)
		.where(whereExpr)
		.limit(limit)
		.offset(offset)
		.orderBy(
			asc(table.documentTable.documentNumber),
			asc(table.documentTable.id)
		);

	const data: GlobalDocumentLinkRow[] = rows.map((r) => ({
		id: r.document.id,
		code: r.document.code,
		documentNumber: r.document.documentNumber,
		locale: r.document.locale,
		clinicalSection: r.document.clinicalSection,
		statusId: r.document.statusId,
		linked: r.linkId != null,
		hospitalDocumentId: r.linkId ?? null,
		documentTypeId: r.linkTypeId ?? null,
		documentSettingId: r.linkSettingId ?? null
	}));

	return { data, total: Number(total), page, pageSize };
}

export async function linkGlobalDocumentToHospital(
	event: RequestEvent,
	input: {
		hospitalId: string;
		documentId: number;
		documentTypeId: number;
		documentSettingId: number;
		locale?: string | null;
	}
) {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const { hospitalId, documentId, documentTypeId, documentSettingId } = input;
	if (!Number.isFinite(documentId) || documentId <= 0) {
		throw error(400, 'Invalid documentId');
	}
	if (!Number.isFinite(documentTypeId) || documentTypeId <= 0) {
		throw error(400, 'documentTypeId is required');
	}
	await assertDocumentSettingAccessible(
		event,
		hospitalId,
		documentSettingId
	);

	const db = ensureDb();
	const [doc] = await db
		.select({ id: table.documentTable.id })
		.from(table.documentTable)
		.where(
			and(
				eq(table.documentTable.id, documentId),
				ne(table.documentTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!doc) throw error(404, 'Global document not found');

	const [existing] = await db
		.select({ id: table.hospitalDocumentTable.id })
		.from(table.hospitalDocumentTable)
		.where(
			and(
				eq(table.hospitalDocumentTable.hospitalId, hospitalId),
				eq(table.hospitalDocumentTable.documentId, documentId)
			)
		)
		.limit(1);
	if (existing) throw error(409, 'Document is already linked to this hospital');

	const locale = (input.locale?.trim() || 'en').slice(0, 16);
	const [row] = await db
		.insert(table.hospitalDocumentTable)
		.values({
			hospitalId,
			documentId,
			documentTypeId,
			documentSettingId,
			locale,
			statusId: StatusEnum.ACTIVE
		})
		.returning();
	if (!row) throw error(500, 'Link failed');
	return row;
}

export async function unlinkGlobalDocumentFromHospital(
	event: RequestEvent,
	input: { hospitalId: string; documentId: number }
) {
	requireUser(event);
	await ensureCanAccessHospital(event, input.hospitalId);

	const { hospitalId, documentId } = input;
	if (!Number.isFinite(documentId) || documentId <= 0) {
		throw error(400, 'Invalid documentId');
	}

	const db = ensureDb();
	const deleted = await db
		.delete(table.hospitalDocumentTable)
		.where(
			and(
				eq(table.hospitalDocumentTable.hospitalId, hospitalId),
				eq(table.hospitalDocumentTable.documentId, documentId)
			)
		)
		.returning({ id: table.hospitalDocumentTable.id });
	if (deleted.length === 0) throw error(404, 'Hospital link not found');
}

export async function getGlobalDocumentPreview(
	event: RequestEvent,
	hospitalId: string,
	documentId: number
): Promise<GlobalDocumentPreview> {
	requireUser(event);
	await ensureCanAccessHospital(event, hospitalId);
	if (!Number.isFinite(documentId) || documentId <= 0) {
		throw error(400, 'Invalid documentId');
	}

	const db = ensureDb();
	const [row] = await db
		.select({
			document: table.documentTable,
			linkId: table.hospitalDocumentTable.id,
			linkTypeId: table.hospitalDocumentTable.documentTypeId,
			linkSettingId: table.hospitalDocumentTable.documentSettingId
		})
		.from(table.documentTable)
		.leftJoin(
			table.hospitalDocumentTable,
			and(
				eq(
					table.hospitalDocumentTable.documentId,
					table.documentTable.id
				),
				eq(table.hospitalDocumentTable.hospitalId, hospitalId)
			)
		)
		.where(
			and(
				eq(table.documentTable.id, documentId),
				ne(table.documentTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	if (!row) throw error(404, 'Global document not found');

	return {
		id: row.document.id,
		code: row.document.code,
		documentNumber: row.document.documentNumber,
		locale: row.document.locale,
		clinicalSection: row.document.clinicalSection,
		statusId: row.document.statusId,
		documentText: row.document.documentText,
		linked: row.linkId != null,
		hospitalDocumentId: row.linkId ?? null,
		documentTypeId: row.linkTypeId ?? null,
		documentSettingId: row.linkSettingId ?? null
	};
}
