import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import {
	documentTypeIdForPrintCode,
	PRINT_CODE_TO_DOCUMENT_TYPE_ID
} from '$lib/model/constant/document-print.constant';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import {
	getDocumentByCode,
	getDocumentById,
	type DocumentWithRelations
} from '$lib/server/medora/document-master/document.server';
import { listDocumentsForHospitalByType } from '$lib/server/medora/document-master/document-print-option.server';
import { listTextPlaceholdersAsMap } from '$lib/server/medora/document-master/text-placeholder.server';

export type DocumentPrintBootstrap = {
	document: DocumentWithRelations | null;
	documentSetting: DocumentWithRelations['documentSetting'];
	textPlaceholders: Record<string, string>;
};

export async function getDocumentPrintBootstrap(
	event: RequestEvent,
	hospitalId: string,
	opts: {
		code?: string;
		documentId?: number;
		documentTypeId?: number;
	}
): Promise<DocumentPrintBootstrap> {
	const trimmedCode = opts.code?.trim() ?? '';
	let doc: DocumentWithRelations | null = null;

	if (opts.documentId != null && Number.isFinite(opts.documentId)) {
		doc = await getDocumentById(event, opts.documentId, { hospitalId });
	} else if (trimmedCode) {
		doc = await getDocumentByCode(event, trimmedCode, { hospitalId });
	} else if (opts.documentTypeId != null && Number.isFinite(opts.documentTypeId)) {
		const { defaultDocumentId } = await listDocumentsForHospitalByType({
			hospitalId,
			documentTypeId: opts.documentTypeId
		});
		if (defaultDocumentId != null) {
			doc = await getDocumentById(event, defaultDocumentId, { hospitalId });
		}
	}

	if (!trimmedCode && !opts.documentId && !doc) {
		throw error(400, 'code, documentId, or documentTypeId is required');
	}

	const textPlaceholders = await listTextPlaceholdersAsMap(hospitalId);
	const layout =
		doc?.documentSetting ??
		(doc?.documentSettingId != null && doc.documentSettingId > 0
			? await loadHospitalLayoutSetting(hospitalId, doc.documentSettingId)
			: null);

	return {
		document: doc,
		documentSetting: layout,
		textPlaceholders
	};
}

async function loadHospitalLayoutSetting(
	hospitalId: string,
	documentSettingId: number
) {
	const [row] = await ensureDb()
		.select()
		.from(table.hospitalDocumentSettingsTable)
		.where(
			and(
				eq(table.hospitalDocumentSettingsTable.id, documentSettingId),
				eq(table.hospitalDocumentSettingsTable.hospitalId, hospitalId)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function listDocumentPrintOptions(
	event: RequestEvent,
	hospitalId: string,
	documentTypeId: number
) {
	await ensureCanAccessHospital(event, hospitalId);
	if (!Number.isFinite(documentTypeId) || documentTypeId <= 0) {
		throw error(400, 'Invalid documentTypeId');
	}
	return listDocumentsForHospitalByType({ hospitalId, documentTypeId });
}

export async function resolveDocumentTypeId(
	documentId: number,
	hospitalId?: string
): Promise<number | null> {
	const where = [eq(table.hospitalDocumentTable.documentId, documentId)];
	if (hospitalId) {
		where.push(eq(table.hospitalDocumentTable.hospitalId, hospitalId));
	}
	const row = await ensureDb()
		.select({
			documentTypeId: table.hospitalDocumentTable.documentTypeId
		})
		.from(table.hospitalDocumentTable)
		.where(and(...where))
		.limit(1);
	return row[0]?.documentTypeId ?? null;
}

export function documentTypeIdFromLegacyPrintCode(code: string): number | null {
	return documentTypeIdForPrintCode(code) ?? PRINT_CODE_TO_DOCUMENT_TYPE_ID[code] ?? null;
}
