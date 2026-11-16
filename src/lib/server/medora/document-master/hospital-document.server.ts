import { and, eq, ne } from 'drizzle-orm';
import { DocumentTypeId } from '$lib/model/constant/document-type-id.constant';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function getHospitalDefaultLocale(hospitalId: string): Promise<string> {
	const [row] = await ensureDb()
		.select({ locale: table.hospitalDocumentTable.locale })
		.from(table.hospitalDocumentTable)
		.where(eq(table.hospitalDocumentTable.hospitalId, hospitalId))
		.limit(1);
	return row?.locale ?? 'en';
}

export async function listEnabledClinicalDocuments(hospitalId: string) {
	const locale = await getHospitalDefaultLocale(hospitalId);
	const docs = await ensureDb()
		.select({ doc: table.documentTable })
		.from(table.hospitalDocumentTable)
		.innerJoin(
			table.documentTable,
			eq(table.hospitalDocumentTable.documentId, table.documentTable.id)
		)
		.where(
			and(
				eq(table.hospitalDocumentTable.hospitalId, hospitalId),
				eq(table.hospitalDocumentTable.documentTypeId, DocumentTypeId.CLINICAL_DOCUMENT),
				eq(table.documentTable.statusId, StatusEnum.ACTIVE)
			)
		);
	return { documents: docs.map((r) => r.doc), locale };
}

export async function resolveDocumentForHospital(input: {
	hospitalId: string;
	code: string;
}): Promise<number | null> {
	const trimmed = input.code.trim();
	if (!trimmed) return null;

	const [byCode] = await ensureDb()
		.select({ id: table.documentTable.id })
		.from(table.hospitalDocumentTable)
		.innerJoin(
			table.documentTable,
			eq(table.hospitalDocumentTable.documentId, table.documentTable.id)
		)
		.where(
			and(
				eq(table.hospitalDocumentTable.hospitalId, input.hospitalId),
				eq(table.documentTable.code, trimmed),
				ne(table.documentTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	return byCode?.id ?? null;
}

export async function assertHospitalLinkedDocument(
	hospitalId: string,
	documentId: number
): Promise<void> {
	const [row] = await ensureDb()
		.select({ id: table.hospitalDocumentTable.id })
		.from(table.hospitalDocumentTable)
		.where(
			and(
				eq(table.hospitalDocumentTable.hospitalId, hospitalId),
				eq(table.hospitalDocumentTable.documentId, documentId)
			)
		)
		.limit(1);
	if (!row) {
		const { error } = await import('@sveltejs/kit');
		throw error(403, 'Document is not available for this hospital');
	}
}
