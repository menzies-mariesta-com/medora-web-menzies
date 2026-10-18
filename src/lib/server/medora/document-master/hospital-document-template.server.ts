import { error } from '@sveltejs/kit';
import { and, eq, isNull, ne, or } from 'drizzle-orm';
import { DocumentCatalogKindEnum } from '$lib/model/enum/document-catalog.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureDocumentCatalogSynced } from './document-catalog-sync.server';

export async function getOrCreateHospitalDocumentSetting(hospitalId: string) {
	const db = ensureDb();
	const row = await db.query.hospitalDocumentSettingTable.findFirst({
		where: (t, { eq: e }) => e(t.hospitalId, hospitalId)
	});
	if (row) return row;
	const [created] = await db
		.insert(table.hospitalDocumentSettingTable)
		.values({ hospitalId })
		.returning();
	return created!;
}

export async function getHospitalDefaultLocale(hospitalId: string): Promise<string> {
	const setting = await getOrCreateHospitalDocumentSetting(hospitalId);
	return setting.defaultCatalogLocale ?? 'en';
}

function forkCode(hospitalId: string, catalogCode: string): string {
	const short = hospitalId.replace(/-/g, '').slice(0, 8);
	return `H_${short}_${catalogCode}`.slice(0, 128);
}

export async function resolveSystemDocumentIdForLocale(
	catalogCode: string,
	locale: string
): Promise<number | null> {
	const meta = await ensureDb().query.documentCatalogTable.findFirst({
		where: (t, { eq: e }) => e(t.catalogCode, catalogCode)
	});
	if (!meta) return null;
	const map = (meta.localeDocumentIdsJson as Record<string, number>) ?? {};
	return map[locale] ?? map.en ?? meta.systemDocumentId ?? null;
}

export async function enableHospitalTemplate(input: {
	hospitalId: string;
	catalogCode: string;
	locale: string;
	staffId: string;
	documentSettingId?: number | null;
}) {
	await ensureDocumentCatalogSynced();
	const meta = await ensureDb().query.documentCatalogTable.findFirst({
		where: (t, { eq: e }) => e(t.catalogCode, input.catalogCode)
	});
	if (!meta) throw error(404, 'Catalog template not found');

	const sourceDocId = await resolveSystemDocumentIdForLocale(
		input.catalogCode,
		input.locale
	);
	if (!sourceDocId) throw error(404, 'Template document not found');

	const [sourceDoc] = await ensureDb()
		.select()
		.from(table.documentTable)
		.where(eq(table.documentTable.id, sourceDocId))
		.limit(1);
	if (!sourceDoc) throw error(404, 'Source document missing');

	const existing = await ensureDb().query.hospitalDocumentTemplateTable.findFirst(
		{
			where: (t, { and, eq: e }) =>
				and(
					e(t.hospitalId, input.hospitalId),
					e(t.catalogCode, input.catalogCode)
				)
		}
	);

	if (existing) {
		await ensureDb()
			.update(table.hospitalDocumentTemplateTable)
			.set({
				isEnabled: true,
				locale: input.locale,
				updatedAt: new Date().toISOString()
			})
			.where(eq(table.hospitalDocumentTemplateTable.id, existing.id));
		return existing;
	}

	const [fork] = await ensureDb()
		.insert(table.documentTable)
		.values({
			documentTypeId: sourceDoc.documentTypeId,
			code: forkCode(input.hospitalId, input.catalogCode),
			catalogCode: input.catalogCode,
			isSystemCatalog: false,
			hospitalId: input.hospitalId,
			documentText: sourceDoc.documentText,
			documentNumber: sourceDoc.documentNumber,
			documentSettingId:
				input.documentSettingId ??
				meta.defaultDocumentSettingId ??
				sourceDoc.documentSettingId,
			statusId: StatusEnum.ACTIVE
		})
		.returning();

	if (!fork) throw error(500, 'Fork failed');

	const now = new Date().toISOString();
	const [binding] = await ensureDb()
		.insert(table.hospitalDocumentTemplateTable)
		.values({
			hospitalId: input.hospitalId,
			catalogCode: input.catalogCode,
			locale: input.locale,
			isEnabled: true,
			documentId: fork.id,
			documentSettingId: fork.documentSettingId,
			forkedFromCatalogVersion: meta.catalogVersion,
			enabledAt: now,
			enabledBy: input.staffId
		})
		.returning();

	return binding;
}

export async function disableHospitalTemplate(input: {
	hospitalId: string;
	catalogCode: string;
}) {
	await ensureDb()
		.update(table.hospitalDocumentTemplateTable)
		.set({ isEnabled: false, updatedAt: new Date().toISOString() })
		.where(
			and(
				eq(table.hospitalDocumentTemplateTable.hospitalId, input.hospitalId),
				eq(table.hospitalDocumentTemplateTable.catalogCode, input.catalogCode)
			)
		);
}

export async function listCatalogForHospital(input: {
	hospitalId: string;
	category?: string;
	search?: string;
}) {
	await ensureDocumentCatalogSynced();
	const bindings = await ensureDb()
		.select()
		.from(table.hospitalDocumentTemplateTable)
		.where(eq(table.hospitalDocumentTemplateTable.hospitalId, input.hospitalId));
	const bindingMap = new Map(bindings.map((b) => [b.catalogCode, b]));

	let rows = await ensureDb().select().from(table.documentCatalogTable);
	if (input.category) {
		rows = rows.filter((r) => r.category === input.category);
	}
	if (input.search?.trim()) {
		const q = input.search.trim().toLowerCase();
		rows = rows.filter(
			(r) =>
				r.title.toLowerCase().includes(q) ||
				r.catalogCode.toLowerCase().includes(q)
		);
	}

	return rows.map((r) => {
		const b = bindingMap.get(r.catalogCode);
		return {
			catalogCode: r.catalogCode,
			kind: r.kind,
			category: r.category,
			title: r.title,
			description: r.description,
			tags: (r.tagsJson as string[]) ?? [],
			surfaces: (r.surfacesJson as string[]) ?? [],
			documentTypeId: r.documentTypeId,
			catalogVersion: r.catalogVersion,
			isEnabledForHospital: b?.isEnabled ?? false,
			enabledLocale: b?.locale ?? null,
			forkDocumentId: b?.documentId ?? null
		};
	});
}

export async function listEnabledClinicalDocuments(hospitalId: string) {
	const locale = await getHospitalDefaultLocale(hospitalId);
	const bindings = await ensureDb()
		.select({
			binding: table.hospitalDocumentTemplateTable,
			doc: table.documentTable,
			meta: table.documentCatalogTable
		})
		.from(table.hospitalDocumentTemplateTable)
		.innerJoin(
			table.documentTable,
			eq(table.hospitalDocumentTemplateTable.documentId, table.documentTable.id)
		)
		.innerJoin(
			table.documentCatalogTable,
			eq(
				table.hospitalDocumentTemplateTable.catalogCode,
				table.documentCatalogTable.catalogCode
			)
		)
		.where(
			and(
				eq(table.hospitalDocumentTemplateTable.hospitalId, hospitalId),
				eq(table.hospitalDocumentTemplateTable.isEnabled, true),
				ne(table.hospitalDocumentTemplateTable.statusId, StatusEnum.DELETED),
				ne(table.documentCatalogTable.kind, DocumentCatalogKindEnum.TRANSACTIONAL_PRINT)
			)
		);

	const custom = await ensureDb()
		.select()
		.from(table.documentTable)
		.where(
			and(
				eq(table.documentTable.hospitalId, hospitalId),
				isNull(table.documentTable.catalogCode),
				ne(table.documentTable.statusId, StatusEnum.DELETED)
			)
		);

	const fromBindings = bindings.map((r) => r.doc);
	return { documents: [...fromBindings, ...custom], locale };
}

export async function resolveCatalogCodeForPrintCode(
	printCode: string
): Promise<string | null> {
	const [sysDoc] = await ensureDb()
		.select({ catalogCode: table.documentTable.catalogCode })
		.from(table.documentTable)
		.where(eq(table.documentTable.code, printCode))
		.limit(1);
	if (sysDoc?.catalogCode) return sysDoc.catalogCode;

	const rows = await ensureDb().select().from(table.documentCatalogTable);
	const match = rows.find((r) => r.catalogCode === printCode);
	return match?.catalogCode ?? null;
}

export async function resolveDocumentForHospital(input: {
	hospitalId: string;
	code: string;
	locale?: string;
}): Promise<number | null> {
	const locale =
		input.locale ?? (await getHospitalDefaultLocale(input.hospitalId));

	let catalogCode = input.code;
	const mapped = await resolveCatalogCodeForPrintCode(input.code);
	if (mapped) catalogCode = mapped;

	const binding = await ensureDb().query.hospitalDocumentTemplateTable.findFirst(
		{
			where: (t, { and, eq: e }) =>
				and(
					e(t.hospitalId, input.hospitalId),
					e(t.catalogCode, catalogCode),
					e(t.isEnabled, true)
				)
		}
	);
	if (binding) return binding.documentId;

	return resolveSystemDocumentIdForLocale(catalogCode, locale);
}
