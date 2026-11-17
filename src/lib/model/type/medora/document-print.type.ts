import type { DocumentSettingRow } from '$lib/model/type/document-setting.type';
import type { ClinicalDocumentSectionEnum } from '$lib/model/enum/clinical-document-section.enum';

/** Minimal document shape for print. */
export type DocumentForPrintSetting = {
	documentSettingId?: number | null;
	documentTypeId?: number | null;
	clinicalSection?: ClinicalDocumentSectionEnum | null;
	documentType?: {
		documentType?: string | null;
	} | null;
	documentSetting?: DocumentSettingRow | null;
};

export type ClinicalDocumentRow = DocumentForPrintSetting & {
	id: number;
	documentNumber?: string | null;
	code?: string | null;
	documentText?: string | null;
};

export type DocumentPrintOptionRow = {
	documentId: number;
	code: string | null;
	documentNumber: string | null;
};

export type DocumentMasterPrintBootstrap = {
	document: ClinicalDocumentRow | null;
	documentSetting: DocumentSettingRow | null;
	textPlaceholders: Record<string, string>;
};
