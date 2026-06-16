import type { DocumentForPrintSetting } from '$lib/model/type/heka/document-print.type';
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

/** Picks document_setting row for a master document by explicit id only. */
export function resolveDocumentSettingForDoc(
	documentSettings: DocumentSettingWithRelations[],
	doc: DocumentForPrintSetting
): DocumentSettingRow | null {
	if (!doc.documentSettingId) return null;

	const fromList = documentSettings.find(
		(x) => x.id === doc.documentSettingId
	);
	if (fromList) return fromList;

	const embedded = embeddedDocumentSetting(doc);
	if (embedded?.id === doc.documentSettingId) return embedded;

	return null;
}
