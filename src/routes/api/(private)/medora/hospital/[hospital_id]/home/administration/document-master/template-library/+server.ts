import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ensureDocumentCatalogSynced } from '$lib/server/medora/document-master/document-catalog-sync.server';
import {
	createCatalogTemplateAdmin,
	deleteCatalogTemplateAdmin,
	getCatalogTemplateAdmin,
	listCatalogTemplatesAdmin,
	updateCatalogTemplateAdmin
} from '$lib/server/medora/document-master/document-catalog-admin.server';
import { resolveSystemDocumentIdForLocale } from '$lib/server/medora/document-master/hospital-document-template.server';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	await ensureDocumentCatalogSynced();

	const catalogCode = event.url.searchParams.get('catalogCode');
	if (catalogCode) {
		return json(await getCatalogTemplateAdmin(event, hospitalId, catalogCode));
	}

	const previewCode = event.url.searchParams.get('previewCode');
	const locale = event.url.searchParams.get('locale') ?? 'en';
	if (previewCode) {
		const docId = await resolveSystemDocumentIdForLocale(previewCode, locale);
		if (!docId) throw error(404, 'Preview not found');
		const [doc] = await ensureDb()
			.select()
			.from(table.documentTable)
			.where(eq(table.documentTable.id, docId))
			.limit(1);
		return json({
			catalogCode: previewCode,
			title: doc?.documentNumber,
			html: doc?.documentText ?? '',
			documentSettingId: doc?.documentSettingId
		});
	}

	const page = Number(event.url.searchParams.get('page') ?? '1');
	const pageSize = Number(event.url.searchParams.get('pageSize') ?? '20');
	const search = event.url.searchParams.get('search') ?? undefined;
	const category = event.url.searchParams.get('category') ?? undefined;
	const kind = event.url.searchParams.get('kind') ?? undefined;

	const data = await listCatalogTemplatesAdmin(event, {
		hospitalId,
		page,
		pageSize,
		search,
		category,
		kind
	});
	return json(data);
}

export async function POST(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;

	if (body.action === 'sync') {
		return json(await ensureDocumentCatalogSynced());
	}

	const created = await createCatalogTemplateAdmin(event, hospitalId, {
		catalogCode: String(body.catalogCode ?? ''),
		kind: body.kind != null ? String(body.kind) : undefined,
		category: String(body.category ?? ''),
		title: String(body.title ?? ''),
		description:
			body.description != null ? String(body.description) : null,
		documentTypeId: Number(body.documentTypeId),
		defaultDocumentSettingId: Number(body.defaultDocumentSettingId),
		documentNumber: String(body.documentNumber ?? ''),
		documentText:
			body.documentText != null ? String(body.documentText) : null,
		tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
		surfaces: Array.isArray(body.surfaces) ? body.surfaces.map(String) : undefined
	});
	return json(created);
}

export async function PUT(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	const updated = await updateCatalogTemplateAdmin(event, hospitalId, {
		catalogCode: String(body.catalogCode ?? ''),
		kind: body.kind != null ? String(body.kind) : undefined,
		category: body.category != null ? String(body.category) : undefined,
		title: body.title != null ? String(body.title) : undefined,
		description:
			body.description !== undefined
				? body.description != null
					? String(body.description)
					: null
				: undefined,
		documentTypeId:
			body.documentTypeId != null ? Number(body.documentTypeId) : undefined,
		defaultDocumentSettingId:
			body.defaultDocumentSettingId != null
				? Number(body.defaultDocumentSettingId)
				: undefined,
		documentNumber:
			body.documentNumber != null ? String(body.documentNumber) : undefined,
		documentText:
			body.documentText !== undefined
				? body.documentText != null
					? String(body.documentText)
					: null
				: undefined,
		tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
		surfaces: Array.isArray(body.surfaces)
			? body.surfaces.map(String)
			: undefined,
		statusId: body.statusId != null ? Number(body.statusId) : undefined
	});
	return json(updated);
}

export async function DELETE(event: RequestEvent) {
	const hospitalId = event.params.hospital_id ?? '';
	await ensureCanAccessHospital(event, hospitalId);
	const body = (await event.request.json()) as Record<string, unknown>;
	await deleteCatalogTemplateAdmin(
		event,
		hospitalId,
		String(body.catalogCode ?? '')
	);
	return json({ ok: true });
}
