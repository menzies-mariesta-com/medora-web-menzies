import type {
	DocumentCatalogCategoryEnum,
	DocumentCatalogKindEnum,
	DocumentCatalogSurfaceEnum
} from '$lib/model/enum/document-catalog.enum';
import type { ClinicalDocumentSectionEnum } from '$lib/model/enum/clinical-document-section.enum';

export type CatalogLocaleBody = {
	locale: string;
	documentText: string;
	documentNumber: string;
};

export type CatalogTemplateDef = {
	kind: DocumentCatalogKindEnum | string;
	category: DocumentCatalogCategoryEnum | string;
	title: string;
	description?: string;
	tags?: string[];
	surfaces?: DocumentCatalogSurfaceEnum[] | string[];
	documentTypeId: number;
	clinicalSection?: ClinicalDocumentSectionEnum | null;
	defaultDocumentSettingId?: number;
	/** Stable system document id when migrating legacy seeds */
	legacyDocumentId?: number;
	legacyDocumentCode?: string;
	catalogVersion?: number;
	locales: CatalogLocaleBody[];
};
