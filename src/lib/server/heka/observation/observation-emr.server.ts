import { error, type RequestEvent } from '@sveltejs/kit';
import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { normalizePagination, type PaginationParams } from '$lib/model/type/pagination.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	AllergySchema,
	AllergySchemaInsert,
	DiagnosisSchema,
	DiagnosisSchemaInsert,
	DiagnosisSchemaUpdate,
	DiagnosisTypeSchema,
	DocumentSchema,
	FormNameSchema,
	PatientAllergiesSchema,
	PatientAllergiesSchemaInsert,
	PatientAllergiesSchemaUpdate,
	PatientDocumentSchema,
	PatientDocumentSchemaInsert,
	PatientDocumentSchemaUpdate,
	PatientDiagnosisSchema,
	PatientFormEntrySchema,
	PatientFormEntrySchemaUpdate,
	PatientVisitSchemaUpdate,
	PatientVisitSchema,
	ServiceItemSchema,
	ServiceOrderDetailSchema,
	ServiceOrderDetailSchemaInsert,
	ServiceOrderDetailSchemaUpdate,
	ServiceOrderSchema,
	ServiceTaggingSchema,
	StaffSchema
} from '$lib/server/db/schema-type';
import {
	assertVisitNotClinicallySigned,
	assertVisitNotClinicallySignedByServiceOrderId
} from '$lib/server/visit-clinical-lock.server';
import { PREFIX_PURPOSE_STORAGE } from '$lib/model/const/prefix-purpose.const';
import { generatePrefix } from '$lib/server/heka/prefix/prefix-generator.server';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import type { VisitServiceLinePrintRow } from '$lib/util/document-placeholder.util';
import { formatMoneyAmount } from '$lib/util/number-display.util';

export type DiagnosisWithType = DiagnosisSchema & {
	diagnosisType: DiagnosisTypeSchema | null;
};

export async function getDiagnosisTypes(): Promise<DiagnosisTypeSchema[]> {
	return ensureDb()
		.select()
		.from(table.diagnosisTypeTable)
		.where(ne(table.diagnosisTypeTable.statusId, StatusEnum.DELETED))
		.orderBy(table.diagnosisTypeTable.name);
}

export async function getDiagnosisById(input: {
	id: number;
}): Promise<DiagnosisWithType | null> {
	const row = await ensureDb().query.diagnosisTable.findFirst({
		where: (t, { and, eq, ne }) =>
			and(eq(t.id, input.id), ne(t.statusId, StatusEnum.DELETED)),
		with: { diagnosisType: true }
	});
	return (row as DiagnosisWithType | null) ?? null;
}

export async function getDiagnosesByVisitId(input: {
	visitId: number;
}): Promise<DiagnosisWithType[]> {
	return (await ensureDb().query.diagnosisTable.findMany({
		where: (t, { and, eq, ne }) =>
			and(eq(t.visitId, input.visitId), ne(t.statusId, StatusEnum.DELETED)),
		with: { diagnosisType: true },
		orderBy: (t, { desc }) => desc(t.createdAt)
	})) as DiagnosisWithType[];
}

export async function createDiagnosis(
	payload: DiagnosisSchemaInsert
): Promise<DiagnosisSchema> {
	await assertVisitNotClinicallySigned(payload.visitId);
	const [row] = await ensureDb()
		.insert(table.diagnosisTable)
		.values(payload)
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateDiagnosis(payload: {
	id: number;
} & DiagnosisSchemaUpdate): Promise<DiagnosisSchema> {
	const { id, ...data } = payload;
	const [existing] = await ensureDb()
		.select({ visitId: table.diagnosisTable.visitId })
		.from(table.diagnosisTable)
		.where(eq(table.diagnosisTable.id, id))
		.limit(1);
	if (!existing) throw new Error('Diagnosis not found');
	await assertVisitNotClinicallySigned(existing.visitId);
	const [row] = await ensureDb()
		.update(table.diagnosisTable)
		.set(data)
		.where(eq(table.diagnosisTable.id, id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteDiagnosis(input: { id: number }): Promise<void> {
	const [existing] = await ensureDb()
		.select({ visitId: table.diagnosisTable.visitId })
		.from(table.diagnosisTable)
		.where(eq(table.diagnosisTable.id, input.id))
		.limit(1);
	if (!existing) throw new Error('Diagnosis not found');
	await assertVisitNotClinicallySigned(existing.visitId);
	await ensureDb()
		.update(table.diagnosisTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(eq(table.diagnosisTable.id, input.id));
}

function prettifyFormCode(code: string): string {
	return code
		.trim()
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.replace(/\b\w/g, (m) => m.toUpperCase());
}

export type PatientFormEntryWithRelations = PatientFormEntrySchema & {
	formName: FormNameSchema | null;
};

export async function getPatientFormEntryById(input: {
	id: number;
}): Promise<PatientFormEntryWithRelations | null> {
	const row = await ensureDb().query.patientFormEntryTable.findFirst({
		where: (t, { and, eq, ne }) =>
			and(eq(t.id, input.id), ne(t.statusId, StatusEnum.DELETED)),
		with: { formName: true }
	});
	return (row as PatientFormEntryWithRelations | null) ?? null;
}

export async function getPatientFormEntriesByVisitIdAndFormCode(input: {
	visitId: number;
	formCode: string;
}): Promise<PatientFormEntryWithRelations[]> {
	const code = input.formCode.trim();
	if (!code) return [];
	const formNameId = await getFormNameIdByCode(code);
	if (!formNameId) return [];
	return (await ensureDb().query.patientFormEntryTable.findMany({
		where: (t, { and, eq, ne }) =>
			and(
				eq(t.visitId, input.visitId),
				eq(t.formNameId, formNameId),
				ne(t.statusId, StatusEnum.DELETED)
			),
		with: { formName: true },
		orderBy: (t, { desc }) => desc(t.createdAt)
	})) as PatientFormEntryWithRelations[];
}

async function getFormNameIdByCode(code: string): Promise<number | null> {
	const row = await ensureDb().query.formNameTable.findFirst({
		where: (t, { and, eq, ne }) =>
			and(eq(t.code, code.trim()), ne(t.statusId, StatusEnum.DELETED))
	});
	return row?.id ?? null;
}

async function ensureFormNameIdByCode(code: string): Promise<number> {
	const normalizedCode = code.trim();
	const existingId = await getFormNameIdByCode(normalizedCode);
	if (existingId) return existingId;
	const [created] = await ensureDb()
		.insert(table.formNameTable)
		.values({
			code: normalizedCode,
			name: prettifyFormCode(normalizedCode),
			formType: 'observation_emr_visit',
			statusId: StatusEnum.ACTIVE
		})
		.returning({ id: table.formNameTable.id });
	if (!created) throw new Error(`Unable to create form name: ${normalizedCode}`);
	return created.id;
}

export async function createPatientFormEntry(payload: {
	branchId: string;
	patientId: string;
	visitId: number;
	description: string;
	statusId: number;
	formCode: string;
}): Promise<PatientFormEntrySchema> {
	await assertVisitNotClinicallySigned(payload.visitId);
	const formNameId = await ensureFormNameIdByCode(payload.formCode);
	const [row] = await ensureDb()
		.insert(table.patientFormEntryTable)
		.values({
			branchId: payload.branchId,
			patientId: payload.patientId,
			visitId: payload.visitId,
			description: payload.description,
			statusId: payload.statusId,
			formNameId
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updatePatientFormEntry(payload: {
	id: number;
} & PatientFormEntrySchemaUpdate): Promise<PatientFormEntrySchema> {
	const { id, ...data } = payload;
	const [existing] = await ensureDb()
		.select({
			visitId: table.patientFormEntryTable.visitId
		})
		.from(table.patientFormEntryTable)
		.where(eq(table.patientFormEntryTable.id, id))
		.limit(1);
	if (!existing) throw new Error('Form entry not found');
	await assertVisitNotClinicallySigned(existing.visitId);
	const [row] = await ensureDb()
		.update(table.patientFormEntryTable)
		.set(data)
		.where(eq(table.patientFormEntryTable.id, id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deletePatientFormEntry(input: { id: number }): Promise<void> {
	const [existing] = await ensureDb()
		.select({
			visitId: table.patientFormEntryTable.visitId
		})
		.from(table.patientFormEntryTable)
		.where(eq(table.patientFormEntryTable.id, input.id))
		.limit(1);
	if (!existing) throw new Error('Form entry not found');
	await assertVisitNotClinicallySigned(existing.visitId);
	await ensureDb()
		.update(table.patientFormEntryTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(eq(table.patientFormEntryTable.id, input.id));
}

export type DocumentWithRelations = DocumentSchema & {
	documentType: any;
	documentSetting: any;
	status: any;
	patientDocuments: any;
};

export async function getDocumentsWithRelations(): Promise<DocumentWithRelations[]> {
	return (await ensureDb().query.documentTable.findMany({
		where: ne(table.documentTable.statusId, StatusEnum.DELETED),
		with: {
			documentType: true,
			documentSetting: true,
			status: true,
			patientDocuments: true
		}
	})) as DocumentWithRelations[];
}

export async function getPatientDocumentsByVisitIdWithRelations(input: {
	visitId: number;
}) {
	return ensureDb().query.patientDocumentTable.findMany({
		where: (t, { and, eq, ne }) =>
			and(eq(t.visitId, input.visitId), ne(t.statusId, StatusEnum.DELETED)),
		with: {
			patient: true,
			visit: true,
			document: { with: { documentType: true } },
			status: true
		},
		orderBy: (t, { desc }) => desc(t.id)
	});
}

export type PatientDocumentWithRelations = Awaited<
	ReturnType<typeof getPatientDocumentsByVisitIdWithRelations>
>[number];

export async function getPatientDocumentById(input: {
	id: number;
}): Promise<PatientDocumentSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.patientDocumentTable)
		.where(eq(table.patientDocumentTable.id, input.id))
		.limit(1);
	return row ?? null;
}

export async function createPatientDocument(
	payload: PatientDocumentSchemaInsert
): Promise<PatientDocumentSchema> {
	await assertVisitNotClinicallySigned(payload.visitId);
	const [row] = await ensureDb()
		.insert(table.patientDocumentTable)
		.values(payload)
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updatePatientDocument(payload: {
	id: number;
} & PatientDocumentSchemaUpdate): Promise<PatientDocumentSchema> {
	const { id, ...rest } = payload;
	const [pre] = await ensureDb()
		.select({ visitId: table.patientDocumentTable.visitId })
		.from(table.patientDocumentTable)
		.where(eq(table.patientDocumentTable.id, id))
		.limit(1);
	if (!pre) throw new Error('Patient document not found');
	await assertVisitNotClinicallySigned(pre.visitId);
	const [row] = await ensureDb()
		.update(table.patientDocumentTable)
		.set(rest)
		.where(eq(table.patientDocumentTable.id, id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function getPatientVisitById(input: {
	id: number;
	hospitalId: string;
}): Promise<PatientVisitSchema | null> {
	const row = await ensureDb().query.patientVisitTable.findFirst({
		where: (t, { and, eq, ne }) =>
			and(
				eq(t.id, input.id),
				eq(t.hospitalId, input.hospitalId),
				ne(t.statusId, StatusEnum.DELETED)
			),
		with: {
			patient: true,
			hospital: true,
			branch: true
		}
	});
	return (row as any) ?? null;
}

export async function updatePatientVisit(input: {
	id: number;
	chiefComplaint?: string | null;
	patientCondition?: string | null;
	diagnosisNotes?: string | null;
}): Promise<PatientVisitSchema> {
	await assertVisitNotClinicallySigned(input.id);
	const { id, ...rest } = input;
	const [row] = await ensureDb()
		.update(table.patientVisitTable)
		.set(rest)
		.where(eq(table.patientVisitTable.id, id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function signPatientVisitClinical(input: {
	visitId: number;
}): Promise<PatientVisitSchema> {
	// Delegate to existing logic by reproducing minimal checks.
	const [cur] = await ensureDb()
		.select({ clinicalSignedAt: table.patientVisitTable.clinicalSignedAt })
		.from(table.patientVisitTable)
		.where(eq(table.patientVisitTable.id, input.visitId))
		.limit(1);
	if (!cur) throw new Error('Visit not found');
	if (cur.clinicalSignedAt != null && String(cur.clinicalSignedAt).trim() !== '') {
		throw new Error('This visit is already saved as signed.');
	}
	const [row] = await ensureDb()
		.update(table.patientVisitTable)
		.set({ clinicalSignedAt: new Date().toISOString() })
		.where(eq(table.patientVisitTable.id, input.visitId))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function getPatientAllergiesByPatientIdWithRelations(input: {
	patientId: string;
}) {
	return ensureDb().query.patientAllergyTable.findMany({
		where: (t, { and, eq, ne }) =>
			and(eq(t.patientId, input.patientId), ne(t.statusId, StatusEnum.DELETED)),
		with: { patient: true, allergy: true, severity: true, visit: true, status: true },
		orderBy: (t, { desc }) => desc(t.id)
	});
}

export type PatientAllergyWithRelations = Awaited<
	ReturnType<typeof getPatientAllergiesByPatientIdWithRelations>
>[number];

export async function getPatientAllergiesByPatientIdWithRelationsPaginated(input: {
	patientId: string;
	hospitalId?: string;
	page: number;
	pageSize: number;
	visitNo?: string | null;
	severityName?: string | null;
	statusId?: number | null;
}): Promise<{ data: PatientAllergyWithRelations[]; total: number }> {
	const rows = await getPatientAllergiesByPatientIdWithRelations({
		patientId: input.patientId
	});
	const visitNoTerm = input.visitNo?.trim().toLowerCase();
	const severityTerm = input.severityName?.trim().toLowerCase();
	const filtered = rows.filter((row: any) => {
		if (input.hospitalId && row.visit?.hospitalId !== input.hospitalId) return false;
		if (input.statusId != null && row.statusId !== input.statusId) return false;
		if (visitNoTerm && !(row.visit?.visitNo ?? '').toLowerCase().includes(visitNoTerm)) return false;
		if (severityTerm && !(row.severity?.name ?? '').toLowerCase().includes(severityTerm)) return false;
		return true;
	});
	const page = Math.max(1, Math.floor(input.page));
	const pageSize = Math.max(1, Math.floor(input.pageSize));
	const offset = (page - 1) * pageSize;
	return { data: filtered.slice(offset, offset + pageSize), total: filtered.length };
}

export async function deletePatientAllergies(input: { id: number }): Promise<void> {
	const [existing] = await ensureDb()
		.select({ visitId: table.patientAllergyTable.visitId })
		.from(table.patientAllergyTable)
		.where(eq(table.patientAllergyTable.id, input.id))
		.limit(1);
	if (existing) await assertVisitNotClinicallySigned(existing.visitId);
	await ensureDb()
		.update(table.patientAllergyTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.patientAllergyTable.id, input.id));
}

export async function listAllergiesMaster(): Promise<AllergySchema[]> {
	return ensureDb()
		.select()
		.from(table.allergyTable)
		.where(ne(table.allergyTable.statusId, StatusEnum.DELETED))
		.orderBy(table.allergyTable.id);
}

export async function getAllergyMasterById(input: {
	id: number;
}): Promise<AllergySchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.allergyTable)
		.where(
			and(
				eq(table.allergyTable.id, input.id),
				ne(table.allergyTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function getAllergyMasterPaginated(
	params?: PaginationParams
): Promise<{
	data: AllergySchema[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}> {
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const search = params?.search?.trim();
	let whereExpr = ne(table.allergyTable.statusId, StatusEnum.DELETED);
	if (search) {
		whereExpr = and(
			whereExpr,
			ilike(table.allergyTable.name, `%${search}%`)
		) as typeof whereExpr;
	}
	const [data, countResult] = await Promise.all([
		ensureDb()
			.select()
			.from(table.allergyTable)
			.where(whereExpr)
			.orderBy(desc(table.allergyTable.id))
			.limit(limit)
			.offset(offset),
		ensureDb()
			.select({ count: count() })
			.from(table.allergyTable)
			.where(whereExpr)
	]);
	const total = countResult[0]?.count ?? 0;
	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function createAllergyMaster(
	payload: AllergySchemaInsert
): Promise<AllergySchema> {
	// Normalize to reduce case/whitespace duplicates and align with likely DB uniqueness rules.
	const nameRaw = typeof payload.name === 'string' ? payload.name : '';
	const name = nameRaw.replace(/\s+/g, ' ').trim();
	if (!name) throw error(400, 'Allergy name is required.');

	const normalized = name.toLocaleLowerCase();

	// Best-effort pre-check (still race-prone, so we also handle insert conflicts below).
	const [existing] = await ensureDb()
		.select()
		.from(table.allergyTable)
		.where(
			and(
				ne(table.allergyTable.statusId, StatusEnum.DELETED),
				sql`lower(${table.allergyTable.name}) = ${normalized}`
			)
		)
		.limit(1);
	if (existing) {
		throw error(
			400,
			'An allergy with this name already exists in the master list.'
		);
	}

	try {
		const [row] = await ensureDb()
			.insert(table.allergyTable)
			.values({ ...payload, name })
			.returning();
		if (!row) throw error(400, 'Failed to create allergy.');
		return row;
	} catch (err) {
		// If DB has a uniqueness constraint on name (or lower(name)), report a clean 400.
		// (Drizzle wraps pg errors; message is the most portable signal here.)
		const msg = err instanceof Error ? err.message : String(err);
		if (/duplicate key|unique constraint|already exists/i.test(msg)) {
			throw error(
				400,
				'An allergy with this name already exists in the master list.'
			);
		}
		throw err;
	}
}

export async function getPatientAllergyRowById(input: {
	id: number;
}): Promise<PatientAllergiesSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.patientAllergyTable)
		.where(
			and(
				eq(table.patientAllergyTable.id, input.id),
				ne(table.patientAllergyTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function getActivePatientAllergiesRowsByPatientId(input: {
	patientId: string;
}): Promise<PatientAllergiesSchema[]> {
	return ensureDb()
		.select()
		.from(table.patientAllergyTable)
		.where(
			and(
				eq(table.patientAllergyTable.patientId, input.patientId),
				eq(table.patientAllergyTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(table.patientAllergyTable.id);
}

export async function inactivateAllPatientAllergiesForPatient(input: {
	patientId: string;
	deactivationRemark: string;
}): Promise<void> {
	await ensureDb()
		.update(table.patientAllergyTable)
		.set({
			statusId: StatusEnum.INACTIVE,
			deactivationRemark: input.deactivationRemark.trim() || null
		})
		.where(
			and(
				eq(table.patientAllergyTable.patientId, input.patientId),
				ne(table.patientAllergyTable.statusId, StatusEnum.DELETED)
			)
		);
}

export async function inactivateOtherPatientAllergiesForPatient(input: {
	patientId: string;
	excludeId: number;
	deactivationRemark: string;
}): Promise<void> {
	await ensureDb()
		.update(table.patientAllergyTable)
		.set({
			statusId: StatusEnum.INACTIVE,
			deactivationRemark: input.deactivationRemark.trim() || null
		})
		.where(
			and(
				eq(table.patientAllergyTable.patientId, input.patientId),
				ne(table.patientAllergyTable.id, input.excludeId),
				ne(table.patientAllergyTable.statusId, StatusEnum.DELETED)
			)
		);
}

export async function inactivatePatientAllergiesByAllergyIdForPatient(input: {
	patientId: string;
	allergyId: number;
	deactivationRemark: string;
}): Promise<void> {
	await ensureDb()
		.update(table.patientAllergyTable)
		.set({
			statusId: StatusEnum.INACTIVE,
			deactivationRemark: input.deactivationRemark.trim() || null
		})
		.where(
			and(
				eq(table.patientAllergyTable.patientId, input.patientId),
				eq(table.patientAllergyTable.allergyId, input.allergyId),
				ne(table.patientAllergyTable.statusId, StatusEnum.DELETED)
			)
		);
}

export async function createPatientAllergyRecord(
	payload: PatientAllergiesSchemaInsert
): Promise<PatientAllergiesSchema> {
	await assertVisitNotClinicallySigned(payload.visitId);
	const [row] = await ensureDb()
		.insert(table.patientAllergyTable)
		.values(payload)
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updatePatientAllergyRecord(
	payload: { id: number } & PatientAllergiesSchemaUpdate
): Promise<PatientAllergiesSchema> {
	const { id, ...rest } = payload;
	const [pre] = await ensureDb()
		.select({ visitId: table.patientAllergyTable.visitId })
		.from(table.patientAllergyTable)
		.where(eq(table.patientAllergyTable.id, id))
		.limit(1);
	if (!pre) throw new Error('Allergy not found');
	await assertVisitNotClinicallySigned(pre.visitId);
	const [row] = await ensureDb()
		.update(table.patientAllergyTable)
		.set(rest as PatientAllergiesSchemaUpdate)
		.where(eq(table.patientAllergyTable.id, id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function getPatientVitalsByVisitId(input: {
	visitId: number;
}): Promise<PatientDiagnosisSchema[]> {
	return ensureDb()
		.select()
		.from(table.patientDiagnosisTable)
		.where(
			and(
				eq(table.patientDiagnosisTable.visitId, input.visitId),
				ne(table.patientDiagnosisTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(desc(table.patientDiagnosisTable.createdAt));
}

export async function deletePatientVital(input: { id: number }): Promise<void> {
	const [existing] = await ensureDb()
		.select({ visitId: table.patientDiagnosisTable.visitId })
		.from(table.patientDiagnosisTable)
		.where(eq(table.patientDiagnosisTable.id, input.id))
		.limit(1);
	if (!existing) throw new Error('Vital not found');
	await assertVisitNotClinicallySigned(existing.visitId);
	await ensureDb()
		.update(table.patientDiagnosisTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.patientDiagnosisTable.id, input.id));
}

export async function getServiceOrderDetailRowsForVisit(input: {
	visitId: number;
}): Promise<
	(ServiceOrderDetailSchema & {
		orderNo: string | null;
		serviceName: string | null;
		subCategoryId: number | null;
		subCategoryName: string | null;
	})[]
> {
	const orders = await ensureDb().query.serviceOrderTable.findMany({
		where: (t, { and, eq, ne }) =>
			and(eq(t.visitId, input.visitId), ne(t.statusId, StatusEnum.DELETED)),
		columns: { id: true, orderNo: true },
		with: {
			details: {
				where: (d, { ne }) => ne(d.statusId, StatusEnum.DELETED),
				with: { serviceItem: true }
			}
		}
	});

	const subCategoryIds = new Set<number>();
	for (const ord of orders) {
		for (const d of ord.details) {
			const sid = d.serviceItem?.subCategoryId;
			if (sid != null) subCategoryIds.add(sid);
		}
	}

	let subCategoryNameById = new Map<number, string | null>();
	if (subCategoryIds.size > 0) {
		const subCategories = await ensureDb()
			.select({
				id: table.subCategoryTable.id,
				name: table.subCategoryTable.subCategoryName
			})
			.from(table.subCategoryTable)
			.where(inArray(table.subCategoryTable.id, Array.from(subCategoryIds)));
		subCategoryNameById = new Map(subCategories.map((r) => [r.id, r.name]));
	}

	const out: (ServiceOrderDetailSchema & {
		orderNo: string | null;
		serviceName: string | null;
		subCategoryId: number | null;
		subCategoryName: string | null;
	})[] = [];

	for (const ord of orders) {
		for (const d of ord.details) {
			const { serviceItem, ...detailRow } = d as any;
			const subCategoryId = serviceItem?.subCategoryId ?? null;
			const subCategoryName =
				subCategoryId != null ? subCategoryNameById.get(subCategoryId) ?? null : null;
			out.push({
				...(detailRow as ServiceOrderDetailSchema),
				orderNo: ord.orderNo ?? null,
				serviceName: serviceItem?.serviceName ?? null,
				subCategoryId,
				subCategoryName
			});
		}
	}
	out.sort((a, b) => b.id - a.id);
	return out;
}

export async function getServiceOrderDetailById(input: {
	id: number;
}): Promise<ServiceOrderDetailSchema | null> {
	const [row] = await ensureDb()
		.select()
		.from(table.serviceOrderDetailTable)
		.where(
			and(
				eq(table.serviceOrderDetailTable.id, input.id),
				ne(table.serviceOrderDetailTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function createServiceOrderDetail(
	payload: ServiceOrderDetailSchemaInsert
): Promise<ServiceOrderDetailSchema> {
	await assertVisitNotClinicallySignedByServiceOrderId(payload.serviceOrderId);
	const [row] = await ensureDb()
		.insert(table.serviceOrderDetailTable)
		.values(payload)
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function updateServiceOrderDetail(payload: {
	id: number;
} & ServiceOrderDetailSchemaUpdate): Promise<ServiceOrderDetailSchema> {
	const { id, ...rest } = payload;
	const [existingDetail] = await ensureDb()
		.select({ serviceOrderId: table.serviceOrderDetailTable.serviceOrderId })
		.from(table.serviceOrderDetailTable)
		.where(eq(table.serviceOrderDetailTable.id, id))
		.limit(1);
	if (!existingDetail) throw new Error('Service order detail not found');
	await assertVisitNotClinicallySignedByServiceOrderId(existingDetail.serviceOrderId);
	const [row] = await ensureDb()
		.update(table.serviceOrderDetailTable)
		.set(rest)
		.where(eq(table.serviceOrderDetailTable.id, id))
		.returning();
	if (!row) throw new Error('Update failed');
	return row;
}

export async function deleteServiceOrderDetail(input: { id: number }): Promise<void> {
	const [existing] = await ensureDb()
		.select({ serviceOrderId: table.serviceOrderDetailTable.serviceOrderId })
		.from(table.serviceOrderDetailTable)
		.where(eq(table.serviceOrderDetailTable.id, input.id))
		.limit(1);
	if (existing) await assertVisitNotClinicallySignedByServiceOrderId(existing.serviceOrderId);
	await ensureDb()
		.update(table.serviceOrderDetailTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.serviceOrderDetailTable.id, input.id));
}

export async function getServiceOrder(input: {
	visitId: number;
}): Promise<ServiceOrderSchema[]> {
	return ensureDb()
		.select()
		.from(table.serviceOrderTable)
		.where(
			and(
				eq(table.serviceOrderTable.visitId, input.visitId),
				ne(table.serviceOrderTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(desc(table.serviceOrderTable.id));
}

async function financialYearForHospitalOnDate(
	hospitalId: string,
	orderDateYmd: string
): Promise<{ id: number }> {
	const anchor = new Date(`${orderDateYmd}T12:00:00`);
	if (Number.isNaN(anchor.getTime())) {
		throw error(400, 'Invalid order date');
	}
	const [fy] = await ensureDb()
		.select({ id: table.financialYearTable.id })
		.from(table.financialYearTable)
		.where(
			and(
				eq(table.financialYearTable.hospitalId, hospitalId),
				sql`${table.financialYearTable.startDate} <= ${anchor}`,
				sql`${table.financialYearTable.endDate} >= ${anchor}`
			)
		)
		.limit(1);
	if (!fy) {
		throw error(
			400,
			'Financial year is not configured for this hospital and order date.'
		);
	}
	return fy;
}

export async function createServiceOrder(
	event: RequestEvent,
	payload: {
		branchId: string;
		visitId: number;
		orderDate: string;
		orderTime: string;
		/** Ignored; order number is always allocated server-side from prefix configuration. */
		orderNo?: string | null;
	}
): Promise<ServiceOrderSchema> {
	const hospitalIdParam = event.params.hospital_id;
	const hospitalId =
		typeof hospitalIdParam === 'string' && hospitalIdParam
			? hospitalIdParam
			: '';
	if (!hospitalId) throw error(400, 'Hospital is required');
	await ensureCanAccessHospital(event, hospitalId);

	const visit = await getPatientVisitById({
		id: payload.visitId,
		hospitalId
	});
	if (!visit) throw error(404, 'Visit not found');
	if (visit.branchId !== payload.branchId) {
		throw error(400, 'Branch does not match this visit');
	}

	await assertVisitNotClinicallySigned(payload.visitId);

	const financialYear = await financialYearForHospitalOnDate(
		hospitalId,
		payload.orderDate
	);
	const visitTypeId = visit.visitTypeId ?? undefined;
	const orderNo = await generatePrefix({
		hospitalId,
		branchId: payload.branchId,
		financialYearId: financialYear.id,
		prefixKey: PREFIX_PURPOSE_STORAGE.ORDER_NO,
		context: {
			...(visitTypeId != null ? { visitTypeId } : {}),
			orderDate: payload.orderDate,
			visitId: payload.visitId,
			visitNo: visit.visitNo ?? null
		}
	});

	const [row] = await ensureDb()
		.insert(table.serviceOrderTable)
		.values({
			branchId: payload.branchId,
			visitId: payload.visitId,
			orderDate: payload.orderDate,
			orderTime: payload.orderTime,
			orderNo
		})
		.returning();
	if (!row) throw new Error('Insert failed');
	return row;
}

export async function getSubCategoryByCategoryId(input: {
	categoryId: number;
}): Promise<any[]> {
	return ensureDb()
		.select()
		.from(table.subCategoryTable)
		.where(eq(table.subCategoryTable.categoryId, input.categoryId))
		.orderBy(table.subCategoryTable.subCategoryName);
}

export async function getServiceTagging(input: {
	branchId: string;
	serviceId?: number;
}): Promise<ServiceTaggingSchema[]> {
	let whereExpr: any = and(
		eq(table.serviceTaggingTable.branchId, input.branchId),
		ne(table.serviceTaggingTable.statusId, StatusEnum.DELETED)
	);
	if (input.serviceId != null) {
		whereExpr = and(whereExpr, eq(table.serviceTaggingTable.serviceId, input.serviceId));
	}
	return ensureDb()
		.select()
		.from(table.serviceTaggingTable)
		.where(whereExpr)
		.orderBy(desc(table.serviceTaggingTable.id));
}

export async function getServiceItem(input: {
	hospitalId: string;
	statusId: number | null;
	id?: number;
}): Promise<ServiceItemSchema[]> {
	let whereExpr: any = and(eq(table.serviceItemTable.hospitalId, input.hospitalId));
	if (input.statusId != null) {
		whereExpr = and(whereExpr, eq(table.serviceItemTable.statusId, input.statusId));
	} else {
		whereExpr = and(whereExpr, ne(table.serviceItemTable.statusId, StatusEnum.DELETED));
	}
	if (input.id != null) whereExpr = and(whereExpr, eq(table.serviceItemTable.id, input.id));
	return ensureDb().select().from(table.serviceItemTable).where(whereExpr);
}

export async function getServiceItemPaginated(input: {
	hospitalId: string;
	serviceName?: string;
	statusId?: number;
	page: number;
	pageSize: number;
}): Promise<{ data: ServiceItemSchema[] }> {
	const q = input.serviceName?.trim();
	let whereExpr: any = and(eq(table.serviceItemTable.hospitalId, input.hospitalId));
	if (input.statusId != null) whereExpr = and(whereExpr, eq(table.serviceItemTable.statusId, input.statusId));
	else whereExpr = and(whereExpr, ne(table.serviceItemTable.statusId, StatusEnum.DELETED));
	if (q) whereExpr = and(whereExpr, ilike(table.serviceItemTable.serviceName, `%${q}%`));
	const limit = Math.max(1, Math.floor(input.pageSize));
	const offset = Math.max(0, (Math.max(1, Math.floor(input.page)) - 1) * limit);
	const data = await ensureDb().select().from(table.serviceItemTable).where(whereExpr).limit(limit).offset(offset);
	return { data };
}

export async function getDoctorStaffPaginated(input: {
	hospitalId: string;
	search?: string;
	page: number;
	pageSize: number;
}): Promise<{ data: StaffSchema[] }> {
	const q = input.search?.trim();
	const pattern = q ? `%${q}%` : null;
	const hospitalCondition = sql`${table.staffTable.id} IN (SELECT staff_id FROM staff_hospital WHERE hospital_id = ${input.hospitalId})`;
	const notDeletedCondition = ne(table.staffTable.statusId, StatusEnum.DELETED);
	const doctorCondition = eq(table.staffTable.staffTypeId, 3);
	const searchCondition =
		pattern &&
		or(
			ilike(table.staffTable.firstName, pattern),
			ilike(table.staffTable.middleName, pattern),
			ilike(table.staffTable.lastName, pattern),
			sql`concat_ws(' ', ${table.staffTable.firstName}, ${table.staffTable.middleName}, ${table.staffTable.lastName}) ILIKE ${pattern}`
		);
	let whereExpr: any = searchCondition
		? and(notDeletedCondition, doctorCondition, hospitalCondition, searchCondition)
		: and(notDeletedCondition, doctorCondition, hospitalCondition);
	const limit = Math.max(1, Math.floor(input.pageSize));
	const offset = Math.max(0, (Math.max(1, Math.floor(input.page)) - 1) * limit);
	const data = (await ensureDb().query.staffTable.findMany({
		where: whereExpr,
		with: { title: true, specialization: true, staffDetail: true },
		limit,
		offset,
		orderBy: (t, { desc }) => desc(t.id)
	})) as unknown as StaffSchema[];
	return { data };
}

export async function getStaffByIdWithRelations(input: {
	id: string;
}): Promise<any | null> {
	if (!input.id?.trim()) return null;
	return (
		(await ensureDb().query.staffTable.findFirst({
			where: (t, { eq }) => eq(t.id, input.id),
			with: {
				title: true,
				specialization: true,
				staffDetail: true
			}
		})) ?? null
	);
}

export function assertValidHospitalIdOrThrow(hospitalId: string): void {
	if (!hospitalId) throw error(400, 'Hospital is required');
}

function parseAmount(value: string | null | undefined): number {
	const num = Number(value ?? 0);
	return Number.isFinite(num) ? num : 0;
}

function formatPrintDate(value: string | null | undefined): string {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleDateString();
}

function formatPrintDateTime(value: string | null | undefined): string {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleString();
}

/** Service order lines for EMR print placeholders (nursing complete / clinical document). */
export async function getVisitServiceLinePrintRows(input: {
	visitId: number;
	hospitalId: string;
}): Promise<VisitServiceLinePrintRow[]> {
	const orders = await getServiceOrder({ visitId: input.visitId });
	if (orders.length === 0) return [];

	const orderIds = orders.map((o) => o.id);
	const details = await ensureDb()
		.select()
		.from(table.serviceOrderDetailTable)
		.where(
			and(
				inArray(table.serviceOrderDetailTable.serviceOrderId, orderIds),
				ne(table.serviceOrderDetailTable.statusId, StatusEnum.DELETED)
			)
		)
		.orderBy(asc(table.serviceOrderDetailTable.id));
	const services = await getServiceItem({
		hospitalId: input.hospitalId,
		statusId: null
	});

	const serviceById: Record<number, ServiceItemSchema> = {};
	for (const service of services) {
		serviceById[service.id] = service;
	}

	const orderById: Record<number, ServiceOrderSchema> = {};
	for (const order of orders) {
		orderById[order.id] = order;
	}

	return details.map((detail: ServiceOrderDetailSchema) => {
		const service = serviceById[detail.serviceId];
		const order = orderById[detail.serviceOrderId];
		const amount = parseAmount(detail.serviceAmount);
		const tax = parseAmount(detail.serviceTaxAmount);
		const unit = Number(detail.serviceUnit ?? 1);
		const multiplier = Number.isFinite(unit) && unit > 0 ? unit : 1;
		const lineTotal = (amount + tax) * multiplier;
		const serviceLabel = service?.serviceCode
			? `${service.serviceName} (${service.serviceCode})`
			: (service?.serviceName ?? `Service #${detail.serviceId}`);
		const statusLabel =
			detail.statusId === StatusEnum.ACTIVE
				? 'Active'
				: detail.statusId === StatusEnum.INACTIVE
					? 'Inactive'
					: `Status ${detail.statusId ?? '?'}`;

		return {
			orderNo: order?.orderNo ?? '—',
			orderDate: formatPrintDate(order?.orderDate ?? null),
			statusLabel,
			serviceLabel,
			amount: formatMoneyAmount(amount),
			tax: formatMoneyAmount(tax),
			unit: String(detail.serviceUnit ?? 1),
			lineTotal: formatMoneyAmount(lineTotal),
			nursingCompleteTime: formatPrintDateTime(
				detail.nursingCompleteTime ?? null
			),
			urgent: detail.isUrgent ? 'Yes' : 'No',
			instruction: detail.instruction?.trim() || '—'
		};
	});
}

