import { and, asc, eq } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export type PrintOptionRow = {
	documentId: number;
	code: string | null;
	documentNumber: string | null;
};

/** Active hospital documents for a print surface (`document_type.id`). First row is the default. */
export async function listDocumentsForHospitalByType(input: {
	hospitalId: string;
	documentTypeId: number;
}): Promise<{ options: PrintOptionRow[]; defaultDocumentId: number | null }> {
	if (!Number.isFinite(input.documentTypeId) || input.documentTypeId <= 0) {
		return { options: [], defaultDocumentId: null };
	}

	const rows = await ensureDb()
		.select({
			documentId: table.documentTable.id,
			code: table.documentTable.code,
			documentNumber: table.documentTable.documentNumber
		})
		.from(table.hospitalDocumentTable)
		.innerJoin(
			table.documentTable,
			eq(table.hospitalDocumentTable.documentId, table.documentTable.id)
		)
		.where(
			and(
				eq(table.hospitalDocumentTable.hospitalId, input.hospitalId),
				eq(table.hospitalDocumentTable.documentTypeId, input.documentTypeId),
				eq(table.documentTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(
			asc(table.documentTable.documentNumber),
			asc(table.documentTable.id)
		);

	const options: PrintOptionRow[] = rows.map((r) => ({
		documentId: r.documentId,
		code: r.code,
		documentNumber: r.documentNumber
	}));

	return {
		options,
		defaultDocumentId: options[0]?.documentId ?? null
	};
}
