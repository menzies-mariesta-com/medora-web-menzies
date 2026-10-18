import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, ilike, ne, or } from 'drizzle-orm';
import { DocumentCatalogKindEnum } from '$lib/model/enum/document-catalog.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { PaginatedResult, PaginationParams } from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';

function requireUser(event: RequestEvent): void {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
}

export type CatalogAdminListRow = {
	catalogCode: string;
	kind: string;
	category: string;
	title: string;
	description: string | null;
	documentTypeId: number;
	catalogVersion: number;
	defaultDocumentSettingId: number | null;
	systemDocumentId: number | null;
	statusId: number;
	createdAt: string;
	updatedAt: string;
	documentNumber: string | null;
};

export type CatalogAdminDetail = CatalogAdminListRow & {
	documentText: string | null;
	code: string | null;
	tags: string[];
	surfaces: string[];
	locale: string;
};

export async function listCatalogTemplatesAdmin(
	event: RequestEvent,
	params: PaginationParams & {
		hospitalId: string;
		search?: string;
		category?: string;
		kind?: string;
	}
): Promise<PaginatedResult<CatalogAdminListRow>> {
	requireUser(event);
	await ensureCanAccessHospital(event, params.hospitalId);

	const { page, pageSize, limit, offset } = normalizePagination(params);
	const filters = [ne(table.documentCatalogTable.statusId, StatusEnum.DELETED)];

	if (params.category?.trim()) {
		filters.push(eq(table.documentCatalogTable.category, params.category.trim()));
	}
	if (params.kind?.trim()) {
		filters.push(eq(table.documentCatalogTable.kind, params.kind.trim()));
	}
	if (params.search?.trim()) {
		const q = `%${params.search.trim()}%`;
		filters.push(
			or(
				ilike(table.documentCatalogTable.title, q),
				ilike(table.documentCatalogTable.catalogCode, q)
			)!
		);
	}

	const whereExpr = and(...filters);

	const rows = await ensureDb()
		.select({
			catalogCode: table.documentCatalogTable.catalogCode,
			kind: table.documentCatalogTable.kind,
			category: table.documentCatalogTable.category,
			title: table.documentCatalogTable.title,
			description: table.documentCatalogTable.description,
			documentTypeId: table.documentCatalogTable.documentTypeId,
			catalogVersion: table.documentCatalogTable.catalogVersion,
			defaultDocumentSettingId:
				table.documentCatalogTable.defaultDocumentSettingId,
			systemDocumentId: table.documentCatalogTable.systemDocumentId,
			statusId: table.documentCatalogTable.statusId,
			createdAt: table.documentCatalogTable.createdAt,
			updatedAt: table.documentCatalogTable.updatedAt,
			documentNumber: table.documentTable.documentNumber
		})
		.from(table.documentCatalogTable)
		.leftJoin(
			table.documentTable,
			eq(
				table.documentCatalogTable.systemDocumentId,
				table.documentTable.id
			)
		)
		.where(whereExpr)
		.orderBy(desc(table.documentCatalogTable.updatedAt))
		.limit(limit)
		.offset(offset);

	const [countRow] = await ensureDb()
		.select({ count: count() })
		.from(table.documentCatalogTable)
		.where(whereExpr);

	const total = countRow?.count ?? 0;
	return {
		data: rows,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function getCatalogTemplateAdmin(
	event: RequestEvent,
	hospitalId: string,
	catalogCode: string
): Promise<CatalogAdminDetail> {
	requireUser(event);
	await ensureCanAccessHospital(event, hospitalId);

	const meta = await ensureDb().query.documentCatalogTable.findFirst({
		where: (t, { eq: e }) => e(t.catalogCode, catalogCode)
	});
	if (!meta) throw error(404, 'Catalog template not found');

	const docId =
		meta.systemDocumentId ??
		((meta.localeDocumentIdsJson as Record<string, number>)?.en ?? null);
	if (!docId) throw error(404, 'System document missing');

	const [doc] = await ensureDb()
		.select()
		.from(table.documentTable)
		.where(eq(table.documentTable.id, docId))
		.limit(1);
	if (!doc) throw error(404, 'Document row missing');

	return {
		catalogCode: meta.catalogCode,
		kind: meta.kind,
		category: meta.category,
		title: meta.title,
		description: meta.description,
		documentTypeId: meta.documentTypeId,
		catalogVersion: meta.catalogVersion,
		defaultDocumentSettingId: meta.defaultDocumentSettingId,
		systemDocumentId: meta.systemDocumentId,
		statusId: meta.statusId,
		createdAt: meta.createdAt,
		updatedAt: meta.updatedAt,
		documentNumber: doc.documentNumber,
		documentText: doc.documentText,
		code: doc.code,
		tags: (meta.tagsJson as string[]) ?? [],
		surfaces: (meta.surfacesJson as string[]) ?? [],
		locale: 'en'
	};
}

function assertCatalogCode(code: string): string {
	const trimmed = code.trim();
	if (!/^CATALOG_[A-Z0-9_]+$/.test(trimmed)) {
		throw error(
			400,
			'catalogCode must match CATALOG_UPPER_SNAKE (e.g. CATALOG_CUSTOM_MY_FORM)'
		);
	}
	return trimmed;
}

export async function createCatalogTemplateAdmin(
	event: RequestEvent,
	hospitalId: string,
	payload: {
		catalogCode: string;
		kind?: string;
		category: string;
		title: string;
		description?: string | null;
		documentTypeId: number;
		defaultDocumentSettingId: number;
		documentNumber: string;
		documentText?: string | null;
		tags?: string[];
		surfaces?: string[];
	}
) {
	requireUser(event);
	await ensureCanAccessHospital(event, hospitalId);

	const catalogCode = assertCatalogCode(payload.catalogCode);
	const existing = await ensureDb().query.documentCatalogTable.findFirst({
		where: (t, { eq: e }) => e(t.catalogCode, catalogCode)
	});
	if (existing) throw error(409, 'catalogCode already exists');

	const [doc] = await ensureDb()
		.insert(table.documentTable)
		.values({
			documentTypeId: payload.documentTypeId,
			code: catalogCode,
			catalogCode,
			isSystemCatalog: true,
			hospitalId: null,
			documentText: payload.documentText ?? ' ',
			documentNumber: payload.documentNumber.trim(),
			documentSettingId: payload.defaultDocumentSettingId,
			statusId: StatusEnum.ACTIVE
		})
		.returning();
	if (!doc) throw error(500, 'Insert document failed');

	const now = new Date().toISOString();
	const meta = {
		catalogCode,
		kind: payload.kind ?? DocumentCatalogKindEnum.HTML_PRINT,
		category: payload.category,
		title: payload.title.trim(),
		description: payload.description ?? null,
		tagsJson: payload.tags ?? [],
		surfacesJson: payload.surfaces ?? ['emr_clinical'],
		documentTypeId: payload.documentTypeId,
		systemDocumentId: doc.id,
		catalogVersion: 1,
		defaultDocumentSettingId: payload.defaultDocumentSettingId,
		localeDocumentIdsJson: { en: doc.id },
		statusId: StatusEnum.ACTIVE,
		updatedAt: now
	};

	await ensureDb().insert(table.documentCatalogTable).values(meta);
	return meta;
}

export async function updateCatalogTemplateAdmin(
	event: RequestEvent,
	hospitalId: string,
	payload: {
		catalogCode: string;
		kind?: string;
		category?: string;
		title?: string;
		description?: string | null;
		documentTypeId?: number;
		defaultDocumentSettingId?: number;
		documentNumber?: string;
		documentText?: string | null;
		tags?: string[];
		surfaces?: string[];
		statusId?: number;
	}
) {
	requireUser(event);
	await ensureCanAccessHospital(event, hospitalId);

	const meta = await ensureDb().query.documentCatalogTable.findFirst({
		where: (t, { eq: e }) => e(t.catalogCode, payload.catalogCode)
	});
	if (!meta) throw error(404, 'Catalog template not found');

	const docId = meta.systemDocumentId;
	if (!docId) throw error(404, 'System document missing');

	const docPatch: Record<string, unknown> = {
		updatedAt: new Date().toISOString()
	};
	if (payload.documentTypeId != null) docPatch.documentTypeId = payload.documentTypeId;
	if (payload.defaultDocumentSettingId != null) {
		docPatch.documentSettingId = payload.defaultDocumentSettingId;
	}
	if (payload.documentNumber !== undefined) {
		docPatch.documentNumber = payload.documentNumber;
	}
	if (payload.documentText !== undefined) {
		docPatch.documentText = payload.documentText ?? ' ';
	}

	await ensureDb()
		.update(table.documentTable)
		.set(docPatch)
		.where(eq(table.documentTable.id, docId));

	const localeMap = {
		...((meta.localeDocumentIdsJson as Record<string, number>) ?? {}),
		en: docId
	};

	const catalogPatch = {
		kind: payload.kind ?? meta.kind,
		category: payload.category ?? meta.category,
		title: payload.title?.trim() ?? meta.title,
		description:
			payload.description !== undefined ? payload.description : meta.description,
		documentTypeId: payload.documentTypeId ?? meta.documentTypeId,
		defaultDocumentSettingId:
			payload.defaultDocumentSettingId ?? meta.defaultDocumentSettingId,
		tagsJson: payload.tags ?? (meta.tagsJson as string[]),
		surfacesJson: payload.surfaces ?? (meta.surfacesJson as string[]),
		statusId: payload.statusId ?? meta.statusId,
		catalogVersion: meta.catalogVersion + 1,
		localeDocumentIdsJson: localeMap,
		systemDocumentId: docId,
		updatedAt: new Date().toISOString()
	};

	await ensureDb()
		.update(table.documentCatalogTable)
		.set(catalogPatch)
		.where(eq(table.documentCatalogTable.catalogCode, payload.catalogCode));

	return catalogPatch;
}

export async function deleteCatalogTemplateAdmin(
	event: RequestEvent,
	hospitalId: string,
	catalogCode: string
) {
	requireUser(event);
	await ensureCanAccessHospital(event, hospitalId);

	const meta = await ensureDb().query.documentCatalogTable.findFirst({
		where: (t, { eq: e }) => e(t.catalogCode, catalogCode)
	});
	if (!meta) throw error(404, 'Catalog template not found');

	if (meta.kind === DocumentCatalogKindEnum.TRANSACTIONAL_PRINT) {
		throw error(400, 'Transactional print templates cannot be deleted');
	}

	const bindings = await ensureDb()
		.select({ count: count() })
		.from(table.hospitalDocumentTemplateTable)
		.where(
			and(
				eq(table.hospitalDocumentTemplateTable.catalogCode, catalogCode),
				eq(table.hospitalDocumentTemplateTable.isEnabled, true)
			)
		);
	if ((bindings[0]?.count ?? 0) > 0) {
		throw error(
			400,
			'Disable this template at all hospitals before deleting'
		);
	}

	const docId = meta.systemDocumentId;
	if (docId) {
		await ensureDb()
			.update(table.documentTable)
			.set({ statusId: StatusEnum.INACTIVE })
			.where(eq(table.documentTable.id, docId));
	}

	await ensureDb()
		.update(table.documentCatalogTable)
		.set({
			statusId: StatusEnum.INACTIVE,
			updatedAt: new Date().toISOString()
		})
		.where(eq(table.documentCatalogTable.catalogCode, catalogCode));
}
