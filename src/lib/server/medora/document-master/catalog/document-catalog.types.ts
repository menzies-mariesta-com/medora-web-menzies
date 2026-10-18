import type {
	DocumentCatalogCategoryEnum,
	DocumentCatalogKindEnum,
	DocumentCatalogSurfaceEnum
} from '$lib/model/enum/document-catalog.enum';

export type CatalogLocaleBody = {
	locale: string;
	documentText: string;
	documentNumber: string;
};

export type CatalogTemplateDef = {
	catalogCode: string;
	kind: DocumentCatalogKindEnum | string;
	category: DocumentCatalogCategoryEnum | string;
	title: string;
	description?: string;
	tags?: string[];
	surfaces?: DocumentCatalogSurfaceEnum[] | string[];
	documentTypeId: number;
	defaultDocumentSettingId?: number;
	/** Stable system document id when migrating legacy seeds */
	legacyDocumentId?: number;
	legacyDocumentCode?: string;
	catalogVersion?: number;
	locales: CatalogLocaleBody[];
};
