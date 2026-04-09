import type { DocumentForPrintSetting } from '$lib/model/type/heka/document-print.type';
import type {
	DocumentSettingRow,
	DocumentSettingWithRelations
} from '$lib/model/type/document-setting.type';

/** Picks document_setting row for a master document (same logic as clinical document print). */
export function resolveDocumentSettingForDoc(
	documentSettings: DocumentSettingWithRelations[],
	doc: DocumentForPrintSetting
): DocumentSettingRow | null {
	const docTypeName =
		doc.documentType?.documentType?.trim().toLowerCase() ?? '';
	if (doc.documentSettingId) {
		const s = documentSettings.find(
			(x) => x.id === doc.documentSettingId
		);
		return s ?? null;
	}
	if (doc.documentTypeId) {
		const byTypeId = documentSettings.find(
			(x) => x.documentTypeId === doc.documentTypeId
		);
		if (byTypeId) return byTypeId;
		const byTypeName = documentSettings.find(
			(x) =>
				(x.documentType?.documentType ?? '').trim().toLowerCase() ===
				docTypeName
		);
		if (byTypeName) return byTypeName;
		const bySettingName = documentSettings.find((x) => {
			const name = (x.name ?? '').trim().toLowerCase();
			return Boolean(docTypeName) && name.includes(docTypeName);
		});
		if (bySettingName) return bySettingName;
		if (documentSettings.length === 1) {
			return documentSettings[0];
		}
	}
	return null;
}
