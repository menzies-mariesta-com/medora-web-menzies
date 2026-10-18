export type DocumentCatalogListRow = {
	catalogCode: string;
	kind: string;
	category: string;
	title: string;
	description: string | null;
	tags: string[];
	surfaces: string[];
	documentTypeId: number;
	catalogVersion: number;
	isEnabledForHospital: boolean;
	enabledLocale: string | null;
	forkDocumentId: number | null;
};

export type HospitalDocumentTemplateRow = {
	id: number;
	catalogCode: string;
	title: string;
	locale: string;
	isEnabled: boolean;
	documentId: number;
	documentSettingId: number | null;
	forkedFromCatalogVersion: number | null;
};

export type DocumentCatalogPreviewRow = {
	catalogCode: string;
	title: string;
	html: string;
	documentSettingId: number | null;
};
