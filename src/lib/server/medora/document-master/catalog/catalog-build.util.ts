import { DocumentCatalogKindEnum } from '$lib/model/enum/document-catalog.enum';
import type { CatalogTemplateDef } from './document-catalog.types';
import {
	buildCatalogDocumentShell,
	buildCertificateBody,
	buildFinanceAckBody,
	buildStandardConsentBody,
	buildStandardFormBody
} from './document-catalog.shell';

function slugify(name: string): string {
	return name
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '_')
		.replace(/^_|_$/g, '')
		.slice(0, 48);
}

export function defineConsentTemplates(input: {
	category: string;
	documentTypeId: number;
	defaultDocumentSettingId?: number;
	prefix: string;
	items: { title: string; intro: string; checkboxes?: string[] }[];
}): CatalogTemplateDef[] {
	return input.items.map((item) => {
		const slug = slugify(item.title);
		const body = buildStandardConsentBody({
			intro: item.intro,
			checkboxes: item.checkboxes
		});
		return {
			catalogCode: `CATALOG_${input.prefix}_${slug}`,
			kind: DocumentCatalogKindEnum.HTML_PRINT,
			category: input.category,
			title: item.title,
			documentTypeId: input.documentTypeId,
			defaultDocumentSettingId: input.defaultDocumentSettingId,
			locales: [
				{
					locale: 'en',
					documentNumber: item.title,
					documentText: buildCatalogDocumentShell(body)
				}
			]
		};
	});
}

export function defineFormTemplates(input: {
	category: string;
	documentTypeId: number;
	defaultDocumentSettingId?: number;
	prefix: string;
	items: { title: string; intro?: string; fields: string[] }[];
}): CatalogTemplateDef[] {
	return input.items.map((item) => {
		const slug = slugify(item.title);
		const body = buildStandardFormBody({
			intro: item.intro,
			fields: item.fields
		});
		return {
			catalogCode: `CATALOG_${input.prefix}_${slug}`,
			kind: DocumentCatalogKindEnum.HTML_PRINT,
			category: input.category,
			title: item.title,
			documentTypeId: input.documentTypeId,
			defaultDocumentSettingId: input.defaultDocumentSettingId,
			locales: [
				{
					locale: 'en',
					documentNumber: item.title,
					documentText: buildCatalogDocumentShell(body)
				}
			]
		};
	});
}

export function defineFinanceTemplates(input: {
	category: string;
	prefix: string;
	items: { title: string; intro: string }[];
}): CatalogTemplateDef[] {
	return input.items.map((item) => {
		const slug = slugify(item.title);
		const body = buildFinanceAckBody({ intro: item.intro });
		return {
			catalogCode: `CATALOG_${input.prefix}_${slug}`,
			kind: DocumentCatalogKindEnum.HTML_PRINT,
			category: input.category,
			title: item.title,
			documentTypeId: 8,
			defaultDocumentSettingId: 5,
			locales: [
				{
					locale: 'en',
					documentNumber: item.title,
					documentText: buildCatalogDocumentShell(body)
				}
			]
		};
	});
}

export function defineCertificateTemplates(input: {
	prefix: string;
	items: { title: string; opening: string; fields: string[] }[];
}): CatalogTemplateDef[] {
	return input.items.map((item) => {
		const slug = slugify(item.title);
		const body = buildCertificateBody({
			opening: item.opening,
			fields: item.fields
		});
		return {
			catalogCode: `CATALOG_${input.prefix}_${slug}`,
			kind: DocumentCatalogKindEnum.HTML_PRINT,
			category: 'certificates',
			title: item.title,
			documentTypeId: 4,
			defaultDocumentSettingId: 1,
			locales: [
				{
					locale: 'en',
					documentNumber: item.title,
					documentText: buildCatalogDocumentShell(body)
				}
			]
		};
	});
}

export function attachMyLocaleStub(templates: CatalogTemplateDef[]): CatalogTemplateDef[] {
	return templates.map((t) => {
		const en = t.locales.find((l) => l.locale === 'en');
		if (!en || t.locales.some((l) => l.locale === 'my')) return t;
		return {
			...t,
			locales: [
				...t.locales,
				{
					locale: 'my',
					documentNumber: `${en.documentNumber} (MY)`,
					documentText: en.documentText
				}
			]
		};
	});
}
