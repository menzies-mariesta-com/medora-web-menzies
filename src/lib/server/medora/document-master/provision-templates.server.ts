import { and, eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { StatusEnum } from '$lib/model/enum/db-link';
import { seedLogger } from '$lib/logger';
import * as table from '$lib/server/db/schema';
import { getAllCatalogTemplates } from './catalog/document-catalog.index';
import type { CatalogTemplateDef } from './catalog/document-catalog.types';
import { ESSENTIAL_HOSPITAL_PROVISION_TEMPLATES } from './document-essential-provision.constant';

type DocumentLayoutPresetKey = 'a4_plain' | 'label_100x60' | 'a5_plain';

function layoutPresetForLegacySettingId(
	legacySettingId?: number | null
): DocumentLayoutPresetKey {
	if (legacySettingId === 7) return 'label_100x60';
	if (legacySettingId === 9) return 'a5_plain';
	return 'a4_plain';
}

const LAYOUT_VALUES: Record<
	DocumentLayoutPresetKey,
	Omit<typeof table.hospitalDocumentSettingsTable.$inferInsert, 'hospitalId' | 'name'>
> = {
	a4_plain: {
		marginTop: 10,
		marginBottom: 10,
		marginLeft: 10,
		marginRight: 10,
		paddingTop: 5,
		paddingBottom: 5,
		paddingLeft: 5,
		paddingRight: 5,
		pageSize: 'A4',
		pageOrientation: 'portrait',
		showHeader: false,
		showFooter: false,
		headerHtml: '',
		footerHtml: '',
		statusId: StatusEnum.ACTIVE
	},
	label_100x60: {
		marginTop: 4,
		marginBottom: 4,
		marginLeft: 4,
		marginRight: 4,
		paddingTop: 2,
		paddingBottom: 2,
		paddingLeft: 2,
		paddingRight: 2,
		pageSize: '100mm 60mm',
		pageOrientation: 'portrait',
		showHeader: false,
		showFooter: false,
		headerHtml: '',
		footerHtml: '',
		statusId: StatusEnum.ACTIVE
	},
	a5_plain: {
		marginTop: 8,
		marginBottom: 8,
		marginLeft: 8,
		marginRight: 8,
		paddingTop: 4,
		paddingBottom: 4,
		paddingLeft: 4,
		paddingRight: 4,
		pageSize: 'A5',
		pageOrientation: 'portrait',
		showHeader: false,
		showFooter: false,
		headerHtml: '',
		footerHtml: '',
		statusId: StatusEnum.ACTIVE
	}
};

async function ensureLayout(
	db: NeonHttpDatabase,
	hospitalId: string,
	preset: DocumentLayoutPresetKey
): Promise<number> {
	const name = `__preset_${preset}`;
	const [existing] = await db
		.select({ id: table.hospitalDocumentSettingsTable.id })
		.from(table.hospitalDocumentSettingsTable)
		.where(
			and(
				eq(table.hospitalDocumentSettingsTable.hospitalId, hospitalId),
				eq(table.hospitalDocumentSettingsTable.name, name)
			)
		)
		.limit(1);
	if (existing) return existing.id;
	const [row] = await db
		.insert(table.hospitalDocumentSettingsTable)
		.values({ ...LAYOUT_VALUES[preset], name, hospitalId })
		.returning({ id: table.hospitalDocumentSettingsTable.id });
	if (!row) throw new Error('Failed to create layout preset');
	return row.id;
}

/** Match global `document.id` by legacy print code or document number + locale. */
async function findGlobalDocumentIdForTemplate(
	db: NeonHttpDatabase,
	tpl: CatalogTemplateDef,
	locale: string
): Promise<number | null> {
	const body = tpl.locales.find((l) => l.locale === locale) ?? tpl.locales[0];
	if (!body?.documentText?.trim()) return null;

	if (tpl.legacyDocumentCode?.trim()) {
		const [byCode] = await db
			.select({ id: table.documentTable.id })
			.from(table.documentTable)
			.where(eq(table.documentTable.code, tpl.legacyDocumentCode.trim()))
			.limit(1);
		if (byCode) return byCode.id;
	}

	const [byName] = await db
		.select({ id: table.documentTable.id })
		.from(table.documentTable)
		.where(
			and(
				eq(table.documentTable.locale, locale),
				eq(table.documentTable.documentNumber, body.documentNumber)
			)
		)
		.limit(1);
	return byName?.id ?? null;
}

function catalogTemplateInsertValues(
	tpl: CatalogTemplateDef,
	locale: string,
	body: NonNullable<CatalogTemplateDef['locales'][number]>
) {
	return {
		clinicalSection: tpl.clinicalSection ?? null,
		code: tpl.legacyDocumentCode?.trim() || null,
		locale,
		documentText: body.documentText,
		documentNumber: body.documentNumber,
		statusId: StatusEnum.ACTIVE
	};
}

/** Insert global `document` rows from the code catalog (idempotent by legacy code or name+locale). */
export async function seedGlobalDocumentsFromCatalog(
	db: NeonHttpDatabase,
	locale = 'en'
): Promise<{ inserted: number; skipped: number }> {
	let inserted = 0;
	let skipped = 0;
	for (const tpl of getAllCatalogTemplates()) {
		const body =
			tpl.locales.find((l) => l.locale === locale) ?? tpl.locales[0];
		if (!body?.documentText?.trim()) {
			skipped += 1;
			continue;
		}
		const existingId = await findGlobalDocumentIdForTemplate(
			db,
			tpl,
			locale
		);
		if (existingId) {
			skipped += 1;
			continue;
		}
		await db.insert(table.documentTable).values(
			catalogTemplateInsertValues(tpl, locale, body)
		);
		inserted += 1;
	}
	seedLogger.info(
		`Seeded global documents: ${inserted} inserted, ${skipped} skipped`
	);
	return { inserted, skipped };
}

export async function provisionTemplateForHospital(
	db: NeonHttpDatabase,
	hospitalId: string,
	tpl: CatalogTemplateDef,
	locale = 'en'
): Promise<void> {
	const body =
		tpl.locales.find((l) => l.locale === locale) ?? tpl.locales[0];
	if (!body?.documentText?.trim()) return;

	const layoutId = await ensureLayout(
		db,
		hospitalId,
		layoutPresetForLegacySettingId(tpl.defaultDocumentSettingId)
	);
	let documentId = await findGlobalDocumentIdForTemplate(
		db,
		tpl,
		locale
	);

	if (documentId) {
		const [link] = await db
			.select({ id: table.hospitalDocumentTable.id })
			.from(table.hospitalDocumentTable)
			.where(
				and(
					eq(table.hospitalDocumentTable.hospitalId, hospitalId),
					eq(table.hospitalDocumentTable.documentId, documentId)
				)
			)
			.limit(1);
		if (!link) {
			await db.insert(table.hospitalDocumentTable).values({
				hospitalId,
				documentId,
				documentTypeId: tpl.documentTypeId,
				locale,
				documentSettingId: layoutId
			});
		}
		return;
	}

	const [doc] = await db
		.insert(table.documentTable)
		.values(catalogTemplateInsertValues(tpl, locale, body))
		.returning();

	if (!doc) return;

	await db.insert(table.hospitalDocumentTable).values({
		hospitalId,
		documentId: doc.id,
		documentTypeId: tpl.documentTypeId,
		locale,
		documentSettingId: layoutId
	});
}

export async function provisionTemplatesForHospital(
	hospitalId: string,
	templates?: CatalogTemplateDef[]
): Promise<void> {
	const list = templates ?? ESSENTIAL_HOSPITAL_PROVISION_TEMPLATES;
	const { ensureDb } = await import('$lib/server/db');
	const db = ensureDb();
	for (const tpl of list) {
		try {
			await provisionTemplateForHospital(db, hospitalId, tpl, 'en');
		} catch (e) {
			seedLogger.warn(
				`Provision skip ${tpl.title} @ ${hospitalId}: ${e instanceof Error ? e.message : String(e)}`
			);
		}
	}
}
