import type { DocumentForPrintSetting } from '$lib/model/type/medora/document-print.type';
import type {
	DocumentSettingRow,
	DocumentSettingWithRelations
} from '$lib/model/type/document-setting.type';

function embeddedDocumentSetting(
	doc: DocumentForPrintSetting
): DocumentSettingRow | null {
	const embedded = doc.documentSetting;
	if (!embedded?.id) return null;
	return embedded;
}

/** Layout row for print: embedded on document or from bootstrap.documentSetting. */
export function resolveDocumentSettingForDoc(
	documentSettings: DocumentSettingWithRelations[] | DocumentSettingRow | null | undefined,
	doc: DocumentForPrintSetting
): DocumentSettingRow | null {
	if (documentSettings && !Array.isArray(documentSettings)) {
		return documentSettings;
	}
	if (doc.documentSetting?.id) return doc.documentSetting;

	if (!doc.documentSettingId) return null;

	const fromList = (documentSettings ?? []).find(
		(x) => x.id === doc.documentSettingId
	);
	if (fromList) return fromList;

	const embedded = embeddedDocumentSetting(doc);
	if (embedded?.id === doc.documentSettingId) return embedded;

	return null;
}
