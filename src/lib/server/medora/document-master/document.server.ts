import { error, type RequestEvent } from '@sveltejs/kit';
import { notifyHospitalMasterWrite } from '$lib/server/cache/notify-master-write.server';
import { and, count, eq, inArray, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	DocumentSchema,
	DocumentSchemaInsert,
	DocumentSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';
import { assertDocumentSettingAccessible } from '$lib/server/medora/document-master/document-setting.server';
import { paginatedEntityStatusEq } from '$lib/server/medora/paginated-entity-status-filter.server';
import {
	attachHospitalDocumentType,
	type DocumentHospitalView
} from '$lib/server/medora/document-master/document-hospital-view.server';
import {
	isClinicalDocumentTypeId,
	parseClinicalDocumentSection
} from '$lib/model/constant/clinical-document-section.constant';
import type { ClinicalDocumentSectionEnum } from '$lib/model/enum/clinical-document-section.enum';

const documentWithRelationsWith = {
	status: true,
	patientDocuments: true
} as const;

export type DocumentWithRelations = DocumentHospitalView & {
	documentSetting?: Record<string, unknown> | null;
	status?: Record<string, unknown> | null;
	patientDocuments?: unknown[];
};

function requireUser(event: RequestEvent): void {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
}

export async function getDocumentsWithRelations(
	event: RequestEvent,
	opts?: { hospitalId?: string }
) {
	requireUser(event);
	if (opts?.hospitalId)
		await ensureCanAccessHospital(event, opts.hospitalId);
	return ensureDb().query.documentTable.findMany({
		where: ne(table.documentTable.statusId, StatusEnum.DELETED),
		with: documentWithRelationsWith
	});
}

/** Blank pen-fill forms for the EMR clinical document page (excludes system print templates). */
export async function getClinicalFormDocuments(
	event: RequestEvent,
	opts?: { hospitalId?: string }
): Promise<DocumentWithRelations[]> {
	requireUser(event);
	if (opts?.hospitalId)
		await ensureCanAccessHospital(event, opts.hospitalId);

	if (opts?.hospitalId) {
		const { listEnabledClinicalDocuments } = await import(
			'$lib/server/medora/document-master/hospital-document.server'
		);
		const { documents } = await listEnabledClinicalDocuments(opts.hospitalId);
		const ids = documents.map((d) => d.id);
		if (ids.length === 0) return [];
		const rows = await ensureDb().query.documentTable.findMany({
			where: and(
				inArray(table.documentTable.id, ids),
				ne(table.documentTable.statusId, StatusEnum.DELETED)
			),
			with: documentWithRelationsWith,
			orderBy: (t, { asc }) => [asc(t.documentNumber), asc(t.id)]
		});
		return attachHospitalDocumentType(opts.hospitalId, rows) as DocumentWithRelations[];
	}

	return [];
}

export async function getDocumentById(
	event: RequestEvent,
	id: number,
	opts?: { hospitalId?: string }
): Promise<DocumentWithRelations | null> {
	requireUser(event);
	if (opts?.hospitalId) await ensureCanAccessHospital(event, opts.hospitalId);
	const row = await ensureDb().query.documentTable.findFirst({
		where: and(
			eq(table.documentTable.id, id),
			ne(table.documentTable.statusId, StatusEnum.DELETED)
		),
		with: documentWithRelationsWith
	});
	if (!row) return null;
	if (!opts?.hospitalId) return row as DocumentWithRelations;
	const { assertHospitalLinkedDocument } = await import(
		'$lib/server/medora/document-master/hospital-document.server'
	);
	await assertHospitalLinkedDocument(opts.hospitalId, id);
	const [view] = await attachHospitalDocumentType(opts.hospitalId, [row]);
	return (view ?? null) as DocumentWithRelations | null;
}

export async function getDocumentByCode(
	event: RequestEvent,
	code: string,
	opts?: { hospitalId?: string }
): Promise<DocumentWithRelations | null> {
	requireUser(event);
	const trimmed = code.trim();
	if (!trimmed) return null;

	if (opts?.hospitalId) {
		const { resolveDocumentForHospital } = await import(
			'$lib/server/medora/document-master/hospital-document.server'
		);
		const docId = await resolveDocumentForHospital({
			hospitalId: opts.hospitalId,
			code: trimmed
		});
		if (docId) {
			const row = await ensureDb().query.documentTable.findFirst({
				where: and(
					eq(table.documentTable.id, docId),
					ne(table.documentTable.statusId, StatusEnum.DELETED)
				),
				with: documentWithRelationsWith
			});
			if (row) {
				const [view] = await attachHospitalDocumentType(
					opts.hospitalId,
					[row]
				);
				return view as DocumentWithRelations;
			}
		}
	}

	return null;
}

export async function getDocumentsPaginatedWithRelations(
	event: RequestEvent,
	params?: PaginationParams & {
		statusId?: number | null;
		hospitalId?: string;
	}
): Promise<PaginatedResult<DocumentWithRelations>> {
	requireUser(event);
	if (params?.hospitalId)
		await ensureCanAccessHospital(event, params.hospitalId);

	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const hospitalScope = params?.hospitalId
		? inArray(
				table.documentTable.id,
				ensureDb()
					.select({ id: table.hospitalDocumentTable.documentId })
					.from(table.hospitalDocumentTable)
					.where(
						eq(table.hospitalDocumentTable.hospitalId, params.hospitalId)
					)
			)
		: undefined;

	const whereExpr = and(
		paginatedEntityStatusEq(
			table.documentTable.statusId,
			params?.statusId
		),
		hospitalScope
	);

	const [data, countResult] = await Promise.all([
		ensureDb().query.documentTable.findMany({
			where: whereExpr,
			with: documentWithRelationsWith,
			orderBy: (t, { desc }) => desc(t.createdAt),
			limit,
			offset
		}),
		ensureDb()
			.select({ count: count() })
			.from(table.documentTable)
			.where(whereExpr)
	]);

	const total = countResult[0]?.count ?? 0;
	const enriched = params?.hospitalId
		? await attachHospitalDocumentType(params.hospitalId, data)
		: data;
	return {
		data: enriched as DocumentWithRelations[],
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

async function validateDocumentSettingId(
	event: RequestEvent,
	hospitalId: string | undefined,
	documentSettingId: number | null | undefined
): Promise<number> {
	if (documentSettingId == null || Number.isNaN(documentSettingId)) {
		throw error(400, 'documentSettingId is required');
	}
	if (!hospitalId) {
		throw error(400, 'hospitalId is required to validate document setting');
	}
	await assertDocumentSettingAccessible(
		event,
		hospitalId,
		documentSettingId
	);
	return documentSettingId;
}

function normalizeClinicalSectionForType(
	documentTypeId: number,
	clinicalSection: unknown
): ClinicalDocumentSectionEnum | null {
	if (!isClinicalDocumentTypeId(documentTypeId)) {
		return null;
	}
	const parsed = parseClinicalDocumentSection(clinicalSection);
	if (!parsed) {
		throw error(
			400,
			'Clinical section is required for Clinical Document (consent, instruction, form, or certificate)'
		);
	}
	return parsed;
}

export async function createDocument(
	event: RequestEvent,
	payload: DocumentSchemaInsert & {
		hospitalId?: string;
		documentTypeId: number;
	}
): Promise<DocumentWithRelations> {
	requireUser(event);
	if (!payload.hospitalId) {
		throw error(400, 'hospitalId is required');
	}
	if (!Number.isFinite(payload.documentTypeId) || payload.documentTypeId <= 0) {
		throw error(400, 'documentTypeId is required');
	}
	await ensureCanAccessHospital(event, payload.hospitalId);

	const {
		hospitalId,
		documentTypeId,
		documentSettingId: layoutId,
		...data
	} = payload;
	const documentSettingId = await validateDocumentSettingId(
		event,
		hospitalId,
		layoutId
	);
	const clinicalSection = normalizeClinicalSectionForType(
		documentTypeId,
		data.clinicalSection
	);
	const [row] = await ensureDb()
		.insert(table.documentTable)
		.values({
			...data,
			clinicalSection,
			documentSettingId: null
		})
		.returning();
	if (!row) throw error(500, 'Insert failed');
	await ensureDb().insert(table.hospitalDocumentTable).values({
		hospitalId,
		documentId: row.id,
		documentTypeId,
		documentSettingId
	});
	void notifyHospitalMasterWrite(hospitalId);
	const [view] = await attachHospitalDocumentType(hospitalId, [row]);
	return view as DocumentWithRelations;
}

export async function updateDocument(
	event: RequestEvent,
	payload: DocumentSchemaUpdate & {
		id: number;
		hospitalId?: string;
		documentTypeId?: number;
	}
): Promise<DocumentWithRelations> {
	requireUser(event);
	if (payload.hospitalId)
		await ensureCanAccessHospital(event, payload.hospitalId);

	const { id, hospitalId, documentTypeId, ...rest } = payload;
	if (!hospitalId) throw error(400, 'hospitalId is required');
	const { assertHospitalLinkedDocument } = await import(
		'$lib/server/medora/document-master/hospital-document.server'
	);
	await assertHospitalLinkedDocument(hospitalId, id);
	let layoutId: number | null | undefined;
	if (rest.documentSettingId !== undefined) {
		layoutId = await validateDocumentSettingId(
			event,
			hospitalId,
			rest.documentSettingId
		);
		delete rest.documentSettingId;
	}
	const hospitalPatch: {
		documentSettingId?: number | null;
		documentTypeId?: number;
	} = {};
	if (layoutId !== undefined) hospitalPatch.documentSettingId = layoutId;
	if (documentTypeId !== undefined) {
		if (!Number.isFinite(documentTypeId) || documentTypeId <= 0) {
			throw error(400, 'Invalid documentTypeId');
		}
		hospitalPatch.documentTypeId = documentTypeId;
	}
	if (documentTypeId !== undefined) {
		rest.clinicalSection = normalizeClinicalSectionForType(
			documentTypeId,
			rest.clinicalSection
		);
	} else if (rest.clinicalSection !== undefined) {
		const [link] = await ensureDb()
			.select({
				documentTypeId: table.hospitalDocumentTable.documentTypeId
			})
			.from(table.hospitalDocumentTable)
			.where(
				and(
					eq(table.hospitalDocumentTable.hospitalId, hospitalId),
					eq(table.hospitalDocumentTable.documentId, id)
				)
			)
			.limit(1);
		const linkedTypeId = link?.documentTypeId ?? 0;
		rest.clinicalSection = normalizeClinicalSectionForType(
			linkedTypeId,
			rest.clinicalSection
		);
	}
	const [row] = await ensureDb()
		.update(table.documentTable)
		.set(rest)
		.where(eq(table.documentTable.id, id))
		.returning();
	if (Object.keys(hospitalPatch).length > 0) {
		await ensureDb()
			.update(table.hospitalDocumentTable)
			.set(hospitalPatch)
			.where(
				and(
					eq(table.hospitalDocumentTable.hospitalId, hospitalId),
					eq(table.hospitalDocumentTable.documentId, id)
				)
			);
	}
	if (!row) throw error(500, 'Update failed');
	void notifyHospitalMasterWrite(hospitalId);
	const [view] = await attachHospitalDocumentType(hospitalId, [row]);
	return view as DocumentWithRelations;
}

export async function deleteDocument(
	event: RequestEvent,
	{ id, hospitalId }: { id: number; hospitalId?: string }
): Promise<void> {
	requireUser(event);
	if (hospitalId) await ensureCanAccessHospital(event, hospitalId);
	await ensureDb()
		.update(table.documentTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(eq(table.documentTable.id, id));
}
