import { error } from '@sveltejs/kit';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import {
	ClinicalFormInstanceStatusTaggingEnum,
	StatusEnum
} from '$lib/model/enum/db-link';
import type { ClinicalFormTemplateSchema } from '$lib/model/type/medora/clinical-form.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { SYSTEM_CLINICAL_FORM_TEMPLATES } from './clinical-form-template-definitions';
import { validateClinicalFormValues } from './clinical-form-validation.util';

export async function ensureSystemClinicalFormTemplates() {
	const db = ensureDb();
	for (const tpl of SYSTEM_CLINICAL_FORM_TEMPLATES) {
		const existing = await db.query.clinicalFormTemplateTable.findFirst({
			where: (t, { and, eq, isNull }) =>
				and(eq(t.code, tpl.code), isNull(t.hospitalId))
		});
		if (existing) continue;
		await db.insert(table.clinicalFormTemplateTable).values({
			hospitalId: null,
			code: tpl.code,
			title: tpl.title,
			schemaJson: tpl.schemaJson,
			version: 1,
			statusId: StatusEnum.ACTIVE
		});
	}
}

export async function getTemplateByCode(input: {
	hospitalId: string;
	code: string;
}) {
	await ensureSystemClinicalFormTemplates();
	const rows = await ensureDb()
		.select()
		.from(table.clinicalFormTemplateTable)
		.where(
			and(
				eq(table.clinicalFormTemplateTable.code, input.code),
				sql`(${table.clinicalFormTemplateTable.hospitalId} = ${input.hospitalId} OR ${table.clinicalFormTemplateTable.hospitalId} IS NULL)`,
				eq(table.clinicalFormTemplateTable.statusId, StatusEnum.ACTIVE)
			)
		)
		.orderBy(desc(table.clinicalFormTemplateTable.version))
		.limit(1);
	const row = rows[0];
	if (!row) throw error(404, 'Form template not found');
	return row;
}

export async function listFormInstances(input: {
	hospitalId: string;
	visitId?: string;
	surgicalCaseId?: number;
	contextType?: string;
}) {
	const conditions = [
		eq(table.clinicalFormInstanceTable.hospitalId, input.hospitalId),
		eq(table.clinicalFormInstanceTable.statusId, StatusEnum.ACTIVE)
	];
	if (input.visitId) {
		conditions.push(
			eq(table.clinicalFormInstanceTable.visitId, input.visitId)
		);
	}
	if (input.surgicalCaseId != null) {
		conditions.push(
			eq(
				table.clinicalFormInstanceTable.surgicalCaseId,
				input.surgicalCaseId
			)
		);
	}
	if (input.contextType) {
		conditions.push(
			eq(
				table.clinicalFormInstanceTable.contextType,
				input.contextType
			)
		);
	}
	const rows = await ensureDb()
		.select({
			instance: table.clinicalFormInstanceTable,
			templateCode: table.clinicalFormTemplateTable.code,
			templateTitle: table.clinicalFormTemplateTable.title,
			schemaJson: table.clinicalFormTemplateTable.schemaJson
		})
		.from(table.clinicalFormInstanceTable)
		.innerJoin(
			table.clinicalFormTemplateTable,
			eq(
				table.clinicalFormInstanceTable.templateId,
				table.clinicalFormTemplateTable.id
			)
		)
		.where(and(...conditions))
		.orderBy(desc(table.clinicalFormInstanceTable.updatedAt));
	return rows.map((r) => ({
		...r.instance,
		templateCode: r.templateCode,
		templateTitle: r.templateTitle,
		schemaJson: r.schemaJson as ClinicalFormTemplateSchema
	}));
}

async function visitContext(hospitalId: string, visitId: string) {
	const [visit] = await ensureDb()
		.select({
			branchId: table.patientVisitTable.branchId,
			patientId: table.patientVisitTable.patientId
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, visitId),
				eq(table.patientVisitTable.hospitalId, hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');
	return visit;
}

export async function saveFormInstance(input: {
	id?: number;
	hospitalId: string;
	visitId: string;
	surgicalCaseId?: number | null;
	templateCode: string;
	contextType: string;
	valuesJson: Record<string, unknown>;
	sign?: boolean;
	staffId?: string | null;
}) {
	const template = await getTemplateByCode({
		hospitalId: input.hospitalId,
		code: input.templateCode
	});
	const schema = template.schemaJson as ClinicalFormTemplateSchema;
	const validation = validateClinicalFormValues(
		schema,
		input.valuesJson ?? {}
	);
	if (!validation.ok) throw error(400, validation.message);

	const visit = await visitContext(input.hospitalId, input.visitId);
	const statusTaggingId = input.sign
		? ClinicalFormInstanceStatusTaggingEnum.COMPLETE
		: ClinicalFormInstanceStatusTaggingEnum.DRAFT;

	const payload = {
		hospitalId: input.hospitalId,
		branchId: visit.branchId,
		patientId: visit.patientId,
		visitId: input.visitId,
		surgicalCaseId: input.surgicalCaseId ?? null,
		templateId: template.id,
		contextType: input.contextType,
		valuesJson: input.valuesJson ?? {},
		statusTaggingId,
		signedAt: input.sign ? new Date().toISOString() : null,
		signedBy: input.sign ? (input.staffId ?? null) : null
	};

	if (input.id) {
		const [row] = await ensureDb()
			.update(table.clinicalFormInstanceTable)
			.set(payload)
			.where(
				and(
					eq(table.clinicalFormInstanceTable.id, input.id),
					eq(
						table.clinicalFormInstanceTable.hospitalId,
						input.hospitalId
					)
				)
			)
			.returning();
		if (!row) throw error(404, 'Form instance not found');
		return row;
	}

	const [row] = await ensureDb()
		.insert(table.clinicalFormInstanceTable)
		.values(payload)
		.returning();
	return row;
}

export async function getFormInstanceById(input: {
	hospitalId: string;
	id: number;
}) {
	const row = await ensureDb().query.clinicalFormInstanceTable.findFirst({
		where: (t, { and, eq }) =>
			and(
				eq(t.id, input.id),
				eq(t.hospitalId, input.hospitalId),
				eq(t.statusId, StatusEnum.ACTIVE)
			)
	});
	if (!row) throw error(404, 'Form instance not found');
	const template = await ensureDb().query.clinicalFormTemplateTable.findFirst(
		{
			where: (t, { eq }) => eq(t.id, row.templateId)
		}
	);
	return {
		...row,
		templateCode: template?.code ?? null,
		templateTitle: template?.title ?? null,
		schemaJson: (template?.schemaJson ??
			{}) as ClinicalFormTemplateSchema
	};
}
