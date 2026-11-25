import { error } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	CarePlanContent,
	CarePlanTemplateSchema,
	NursingCarePlanInstanceRow,
	NursingCarePlanTemplateRow
} from '$lib/model/type/medora/clinical-platform.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { validateClinicalFormValues } from '$lib/server/medora/clinical-form/clinical-form-validation.util';
import { visitContext } from '$lib/server/medora/visit/visit-context.server';
import { assertVisitNotClinicallySigned } from '$lib/server/visit-clinical-lock.server';
import { toUtcIsoString } from '$lib/util/utc-instant.util';
import {
	starterCarePlanSchema,
	STARTER_CARE_PLAN_TEMPLATES
} from './nursing-care-plan-template-definitions';

/**
 * The template table has no code column, so `title` is the natural key for
 * seeding. shortcut: title-keyed seeding, upgrade when the table gets a code column.
 */
export async function ensureStarterCarePlanTemplates(
	hospitalId: string
): Promise<void> {
	const db = ensureDb();
	const existing = await db
		.select({ title: table.nursingCarePlanTemplateTable.title })
		.from(table.nursingCarePlanTemplateTable)
		.where(
			eq(table.nursingCarePlanTemplateTable.hospitalId, hospitalId)
		);
	const known = new Set(existing.map((row) => row.title));
	const missing = STARTER_CARE_PLAN_TEMPLATES.filter(
		(tpl) => !known.has(tpl.title)
	);
	if (missing.length === 0) return;
	await db.insert(table.nursingCarePlanTemplateTable).values(
		missing.map((tpl) => ({
			hospitalId,
			title: tpl.title,
			nandaLabel: tpl.nandaLabel,
			sectionsJson: starterCarePlanSchema(tpl.defaults)
		}))
	);
}

export async function listCarePlanTemplates(
	hospitalId: string
): Promise<NursingCarePlanTemplateRow[]> {
	await ensureStarterCarePlanTemplates(hospitalId);
	const rows = await ensureDb()
		.select({
			id: table.nursingCarePlanTemplateTable.id,
			title: table.nursingCarePlanTemplateTable.title,
			nandaLabel: table.nursingCarePlanTemplateTable.nandaLabel,
			sectionsJson: table.nursingCarePlanTemplateTable.sectionsJson
		})
		.from(table.nursingCarePlanTemplateTable)
		.where(
			and(
				eq(table.nursingCarePlanTemplateTable.hospitalId, hospitalId),
				eq(
					table.nursingCarePlanTemplateTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		)
		.orderBy(table.nursingCarePlanTemplateTable.title);
	return rows.map((row) => ({
		...row,
		sectionsJson: row.sectionsJson as CarePlanTemplateSchema
	}));
}

async function getTemplate(
	hospitalId: string,
	templateId: number
): Promise<{
	id: number;
	title: string;
	nandaLabel: string | null;
	schema: CarePlanTemplateSchema;
}> {
	const [row] = await ensureDb()
		.select()
		.from(table.nursingCarePlanTemplateTable)
		.where(
			and(
				eq(table.nursingCarePlanTemplateTable.id, templateId),
				eq(table.nursingCarePlanTemplateTable.hospitalId, hospitalId),
				eq(
					table.nursingCarePlanTemplateTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		)
		.limit(1);
	if (!row) throw error(404, 'Care plan template not found');
	return {
		id: row.id,
		title: row.title,
		nandaLabel: row.nandaLabel,
		schema: row.sectionsJson as CarePlanTemplateSchema
	};
}

/** Required fields are enforced on sign only; a draft is allowed to be half filled. */
function assertContent(
	schema: CarePlanTemplateSchema,
	content: CarePlanContent,
	sign: boolean
): void {
	const validation = validateClinicalFormValues(
		schema,
		content as Record<string, unknown>,
		{ skipRequired: !sign }
	);
	if (!validation.ok) throw error(400, validation.message);
}

export async function listCarePlanInstances(input: {
	hospitalId: string;
	visitId: string;
}): Promise<NursingCarePlanInstanceRow[]> {
	const rows = await ensureDb()
		.select({
			id: table.nursingCarePlanInstanceTable.id,
			visitId: table.nursingCarePlanInstanceTable.visitId,
			templateId: table.nursingCarePlanInstanceTable.templateId,
			contentJson: table.nursingCarePlanInstanceTable.contentJson,
			signedAt: table.nursingCarePlanInstanceTable.signedAt,
			createdAt: table.nursingCarePlanInstanceTable.createdAt,
			templateTitle: table.nursingCarePlanTemplateTable.title,
			nandaLabel: table.nursingCarePlanTemplateTable.nandaLabel,
			signedByFirstName: table.staffTable.firstName,
			signedByLastName: table.staffTable.lastName
		})
		.from(table.nursingCarePlanInstanceTable)
		.leftJoin(
			table.nursingCarePlanTemplateTable,
			eq(
				table.nursingCarePlanTemplateTable.id,
				table.nursingCarePlanInstanceTable.templateId
			)
		)
		.leftJoin(
			table.staffTable,
			eq(
				table.staffTable.id,
				table.nursingCarePlanInstanceTable.signedBy
			)
		)
		.where(
			and(
				eq(
					table.nursingCarePlanInstanceTable.hospitalId,
					input.hospitalId
				),
				eq(table.nursingCarePlanInstanceTable.visitId, input.visitId),
				eq(
					table.nursingCarePlanInstanceTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		)
		.orderBy(desc(table.nursingCarePlanInstanceTable.createdAt));
	return rows.map((row) => ({
		id: row.id,
		visitId: row.visitId,
		templateId: row.templateId,
		templateTitle: row.templateTitle,
		nandaLabel: row.nandaLabel,
		contentJson: (row.contentJson ?? {}) as CarePlanContent,
		signedAt: row.signedAt,
		signedByName:
			[row.signedByFirstName, row.signedByLastName]
				.filter(Boolean)
				.join(' ')
				.trim() || null,
		isSigned: row.signedAt != null,
		createdAt: row.createdAt
	}));
}

async function getInstanceRow(hospitalId: string, id: number) {
	const [row] = await ensureDb()
		.select()
		.from(table.nursingCarePlanInstanceTable)
		.where(
			and(
				eq(table.nursingCarePlanInstanceTable.id, id),
				eq(table.nursingCarePlanInstanceTable.hospitalId, hospitalId),
				eq(
					table.nursingCarePlanInstanceTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		)
		.limit(1);
	if (!row) throw error(404, 'Care plan not found');
	return row;
}

export async function createCarePlanInstance(input: {
	hospitalId: string;
	visitId: string;
	templateId: number;
	contentJson: CarePlanContent;
	sign?: boolean;
	staffId?: string | null;
}): Promise<number> {
	if (input.sign && !input.staffId)
		throw error(401, 'Staff required');
	await assertVisitNotClinicallySigned(input.visitId);
	const template = await getTemplate(
		input.hospitalId,
		input.templateId
	);
	assertContent(
		template.schema,
		input.contentJson,
		Boolean(input.sign)
	);
	const visit = await visitContext(input.hospitalId, input.visitId);
	const [row] = await ensureDb()
		.insert(table.nursingCarePlanInstanceTable)
		.values({
			hospitalId: input.hospitalId,
			branchId: visit.branchId,
			patientId: visit.patientId,
			visitId: input.visitId,
			templateId: template.id,
			contentJson: input.contentJson,
			signedAt: input.sign ? toUtcIsoString() : null,
			signedBy: input.sign ? (input.staffId ?? null) : null
		})
		.returning({ id: table.nursingCarePlanInstanceTable.id });
	if (!row) throw error(500, 'Unable to save care plan');
	return row.id;
}

/**
 * A draft is edited in place. A signed plan is immutable: passing the signed
 * row's id as `supersedesId` writes a new row and retires the old one, so the
 * signed record a clinician put their name on never changes.
 */
export async function updateCarePlanInstance(input: {
	hospitalId: string;
	visitId: string;
	templateId: number;
	contentJson: CarePlanContent;
	sign?: boolean;
	staffId?: string | null;
	id?: number;
	supersedesId?: number;
}): Promise<number> {
	if (input.sign && !input.staffId)
		throw error(401, 'Staff required');
	await assertVisitNotClinicallySigned(input.visitId);
	const template = await getTemplate(
		input.hospitalId,
		input.templateId
	);
	assertContent(
		template.schema,
		input.contentJson,
		Boolean(input.sign)
	);

	if (input.supersedesId == null) {
		if (input.id == null) throw error(400, 'id is required');
		const existing = await getInstanceRow(input.hospitalId, input.id);
		if (existing.visitId !== input.visitId) {
			throw error(400, 'Care plan belongs to a different visit');
		}
		if (existing.signedAt != null) {
			throw error(
				409,
				'Signed care plans cannot be edited; revise instead'
			);
		}
		await ensureDb()
			.update(table.nursingCarePlanInstanceTable)
			.set({
				templateId: template.id,
				contentJson: input.contentJson,
				signedAt: input.sign ? toUtcIsoString() : null,
				signedBy: input.sign ? (input.staffId ?? null) : null
			})
			.where(eq(table.nursingCarePlanInstanceTable.id, input.id));
		return input.id;
	}

	const previous = await getInstanceRow(
		input.hospitalId,
		input.supersedesId
	);
	if (previous.visitId !== input.visitId) {
		throw error(400, 'Care plan belongs to a different visit');
	}
	const visit = await visitContext(input.hospitalId, input.visitId);
	return ensureDb().transaction(async (tx) => {
		const [row] = await tx
			.insert(table.nursingCarePlanInstanceTable)
			.values({
				hospitalId: input.hospitalId,
				branchId: visit.branchId,
				patientId: visit.patientId,
				visitId: input.visitId,
				templateId: template.id,
				contentJson: input.contentJson,
				signedAt: input.sign ? toUtcIsoString() : null,
				signedBy: input.sign ? (input.staffId ?? null) : null
			})
			.returning({ id: table.nursingCarePlanInstanceTable.id });
		if (!row) throw error(500, 'Unable to save care plan');
		await tx
			.update(table.nursingCarePlanInstanceTable)
			.set({ statusId: StatusEnum.INACTIVE })
			.where(eq(table.nursingCarePlanInstanceTable.id, previous.id));
		return row.id;
	});
}

export async function deleteCarePlanInstance(input: {
	hospitalId: string;
	id: number;
}): Promise<void> {
	const existing = await getInstanceRow(input.hospitalId, input.id);
	if (existing.signedAt != null) {
		throw error(
			409,
			'Signed care plans cannot be deleted; revise instead'
		);
	}
	await ensureDb()
		.update(table.nursingCarePlanInstanceTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(eq(table.nursingCarePlanInstanceTable.id, input.id));
}
