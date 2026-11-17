import { and, eq, inArray } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DocumentSchema,
	DocumentSettingSchema,
	DocumentTypeSchema
} from '$lib/server/db/schema-type';

export type DocumentHospitalView = DocumentSchema & {
	documentTypeId: number | null;
	documentType?: DocumentTypeSchema | null;
	/** Per-hospital layout from `hospital_document.document_setting_id` (not `document.document_setting_id`). */
	documentSettingId: number | null;
	documentSetting?: DocumentSettingSchema | null;
};

type HospitalDocumentLink = {
	documentTypeId: number;
	documentSettingId: number | null;
};

async function loadHospitalDocumentLinks(
	hospitalId: string,
	documentIds: number[]
): Promise<Map<number, HospitalDocumentLink>> {
	if (documentIds.length === 0) return new Map();
	const links = await ensureDb()
		.select({
			documentId: table.hospitalDocumentTable.documentId,
			documentTypeId: table.hospitalDocumentTable.documentTypeId,
			documentSettingId: table.hospitalDocumentTable.documentSettingId
		})
		.from(table.hospitalDocumentTable)
		.where(
			and(
				eq(table.hospitalDocumentTable.hospitalId, hospitalId),
				inArray(table.hospitalDocumentTable.documentId, documentIds)
			)
		);
	return new Map(
		links.map((l) => [
			l.documentId,
			{
				documentTypeId: l.documentTypeId,
				documentSettingId: l.documentSettingId
			}
		])
	);
}

export async function attachHospitalDocumentType<T extends { id: number }>(
	hospitalId: string,
	rows: T[]
): Promise<DocumentHospitalView[]> {
	const linkMap = await loadHospitalDocumentLinks(
		hospitalId,
		rows.map((r) => r.id)
	);
	const typeIds = [
		...new Set(
			[...linkMap.values()].map((v) => v.documentTypeId).filter(Boolean)
		)
	];
	const settingIds = [
		...new Set(
			[...linkMap.values()]
				.map((v) => v.documentSettingId)
				.filter((id): id is number => id != null && id > 0)
		)
	];

	const [types, settings] = await Promise.all([
		typeIds.length === 0
			? Promise.resolve([])
			: ensureDb()
					.select()
					.from(table.documentTypeTable)
					.where(inArray(table.documentTypeTable.id, typeIds)),
		settingIds.length === 0
			? Promise.resolve([])
			: ensureDb()
					.select()
					.from(table.hospitalDocumentSettingsTable)
					.where(
						and(
							eq(
								table.hospitalDocumentSettingsTable.hospitalId,
								hospitalId
							),
							inArray(table.hospitalDocumentSettingsTable.id, settingIds)
						)
					)
	]);

	const typeById = new Map(types.map((t) => [t.id, t]));
	const settingById = new Map(settings.map((s) => [s.id, s]));

	return rows.map((row) => {
		const link = linkMap.get(row.id);
		const documentTypeId = link?.documentTypeId ?? null;
		const documentSettingId = link?.documentSettingId ?? null;
		const documentSetting = documentSettingId
			? settingById.get(documentSettingId) ?? null
			: null;
		return {
			...(row as DocumentSchema),
			documentTypeId,
			documentType: documentTypeId ? typeById.get(documentTypeId) ?? null : null,
			documentSettingId,
			documentSetting
		};
	});
}