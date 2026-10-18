import { eq } from 'drizzle-orm';
import { DocumentCatalogKindEnum } from '$lib/model/enum/document-catalog.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { getAllCatalogTemplates } from './catalog/document-catalog.index';
import type { CatalogTemplateDef } from './catalog/document-catalog.types';

function systemDocumentCode(tpl: CatalogTemplateDef): string {
	if (tpl.legacyDocumentCode) return tpl.legacyDocumentCode;
	return tpl.catalogCode;
}

async function upsertSystemDocument(
	tpl: CatalogTemplateDef,
	locale: string,
	body: { documentText: string; documentNumber: string },
	existingId?: number
): Promise<number> {
	const db = ensureDb();
	const code = locale === 'en' ? systemDocumentCode(tpl) : `${systemDocumentCode(tpl)}_${locale}`;
	const values = {
		documentTypeId: tpl.documentTypeId,
		code,
		catalogCode: tpl.catalogCode,
		isSystemCatalog: true,
		hospitalId: null,
		documentText: body.documentText || ' ',
		documentNumber: body.documentNumber,
		documentSettingId: tpl.defaultDocumentSettingId ?? null,
		statusId: StatusEnum.ACTIVE,
		updatedAt: new Date().toISOString()
	};

	if (tpl.legacyDocumentId && locale === 'en') {
		const [row] = await db
			.update(table.documentTable)
			.set(values)
			.where(eq(table.documentTable.id, tpl.legacyDocumentId))
			.returning({ id: table.documentTable.id });
		if (row) return row.id;
	}

	if (existingId) {
		const [row] = await db
			.update(table.documentTable)
			.set(values)
			.where(eq(table.documentTable.id, existingId))
			.returning({ id: table.documentTable.id });
		if (row) return row.id;
	}

	const [inserted] = await db
		.insert(table.documentTable)
		.values(values)
		.returning({ id: table.documentTable.id });
	return inserted!.id;
}

export async function ensureDocumentCatalogSynced(): Promise<{
	synced: number;
}> {
	const templates = getAllCatalogTemplates();
	const db = ensureDb();
	let synced = 0;

	for (const tpl of templates) {
		const localeIds: Record<string, number> = {};
		const existingMeta = await db.query.documentCatalogTable.findFirst({
			where: (t, { eq: e }) => e(t.catalogCode, tpl.catalogCode)
		});
		const existingLocaleJson =
			(existingMeta?.localeDocumentIdsJson as Record<string, number>) ?? {};

		for (const loc of tpl.locales) {
			if (
				tpl.kind === DocumentCatalogKindEnum.TRANSACTIONAL_PRINT &&
				!loc.documentText &&
				tpl.legacyDocumentId
			) {
				localeIds[loc.locale] = tpl.legacyDocumentId;
				continue;
			}
			const docId = await upsertSystemDocument(
				tpl,
				loc.locale,
				loc,
				existingLocaleJson[loc.locale]
			);
			localeIds[loc.locale] = docId;
		}

		const enId = localeIds.en ?? localeIds[Object.keys(localeIds)[0]];
		const meta = {
			catalogCode: tpl.catalogCode,
			kind: tpl.kind,
			category: tpl.category,
			title: tpl.title,
			description: tpl.description ?? null,
			tagsJson: tpl.tags ?? [],
			surfacesJson: tpl.surfaces ?? ['emr_clinical'],
			documentTypeId: tpl.documentTypeId,
			systemDocumentId: enId,
			catalogVersion: tpl.catalogVersion ?? 1,
			defaultDocumentSettingId: tpl.defaultDocumentSettingId ?? null,
			localeDocumentIdsJson: localeIds,
			statusId: StatusEnum.ACTIVE,
			updatedAt: new Date().toISOString()
		};

		await db
			.insert(table.documentCatalogTable)
			.values(meta)
			.onConflictDoUpdate({
				target: table.documentCatalogTable.catalogCode,
				set: meta
			});
		synced++;
	}

	return { synced };
}
