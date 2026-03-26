import type { DocumentWithRelations } from '$lib/remote/table/information-table/document.remote';
import type { DocumentSettingWithRelations } from '$lib/remote/table/information-table/document-setting.remote';
import type { DocumentSettingSchema } from '$lib/server/db/schema-type';

/** Picks document_setting row for a master document (same logic as clinical document print). */
export function resolveDocumentSettingForDoc(
	documentSettings: DocumentSettingWithRelations[],
	doc: DocumentWithRelations
): DocumentSettingSchema | null {
	const docTypeName =
		doc.documentType?.documentType?.trim().toLowerCase() ?? '';
	if (doc.documentSettingId) {
		const s = documentSettings.find(
			(x) => x.id === doc.documentSettingId
		);
		return (s as DocumentSettingSchema | undefined) ?? null;
	}
	if (doc.documentTypeId) {
		const byTypeId = documentSettings.find(
			(x) => x.documentTypeId === doc.documentTypeId
		) as DocumentSettingSchema | null | undefined;
		if (byTypeId) return byTypeId;
		const byTypeName = documentSettings.find(
			(x) =>
				(x.documentType?.documentType ?? '').trim().toLowerCase() ===
				docTypeName
		) as DocumentSettingSchema | null | undefined;
		if (byTypeName) return byTypeName;
		const bySettingName = documentSettings.find((x) => {
			const name = (x.name ?? '').trim().toLowerCase();
			return Boolean(docTypeName) && name.includes(docTypeName);
		}) as DocumentSettingSchema | null | undefined;
		if (bySettingName) return bySettingName;
		if (documentSettings.length === 1) {
			return documentSettings[0] as DocumentSettingSchema;
		}
	}
	return null;
}
