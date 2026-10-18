import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listCarePlanTemplates(hospitalId: string) {
	return ensureDb()
		.select()
		.from(table.nursingCarePlanTemplateTable)
		.where(
			and(
				eq(table.nursingCarePlanTemplateTable.hospitalId, hospitalId),
				eq(
					table.nursingCarePlanTemplateTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		);
}

export async function saveCarePlanTemplate(input: {
	hospitalId: string;
	id?: number;
	title: string;
	nandaLabel?: string | null;
	sectionsJson: unknown[];
}) {
	if (input.id) {
		await ensureDb()
			.update(table.nursingCarePlanTemplateTable)
			.set({
				title: input.title,
				nandaLabel: input.nandaLabel ?? null,
				sectionsJson: input.sectionsJson
			})
			.where(
				and(
					eq(table.nursingCarePlanTemplateTable.id, input.id),
					eq(
						table.nursingCarePlanTemplateTable.hospitalId,
						input.hospitalId
					)
				)
			);
		return input.id;
	}
	const [row] = await ensureDb()
		.insert(table.nursingCarePlanTemplateTable)
		.values({
			hospitalId: input.hospitalId,
			title: input.title,
			nandaLabel: input.nandaLabel ?? null,
			sectionsJson: input.sectionsJson
		})
		.returning({ id: table.nursingCarePlanTemplateTable.id });
	return row?.id;
}

export async function listCarePlanInstances(input: {
	hospitalId: string;
	visitId: string;
}) {
	return ensureDb()
		.select()
		.from(table.nursingCarePlanInstanceTable)
		.where(
			and(
				eq(table.nursingCarePlanInstanceTable.hospitalId, input.hospitalId),
				eq(table.nursingCarePlanInstanceTable.visitId, input.visitId),
				eq(
					table.nursingCarePlanInstanceTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		);
}

export async function saveCarePlanInstance(input: {
	hospitalId: string;
	branchId: string;
	patientId: string;
	visitId: string;
	templateId?: number | null;
	contentJson: Record<string, unknown>;
	id?: number;
	sign?: boolean;
	staffId?: string | null;
}) {
	if (input.id) {
		const patch: Record<string, unknown> = {
			contentJson: input.contentJson,
			templateId: input.templateId ?? null
		};
		if (input.sign && input.staffId) {
			patch.signedAt = new Date();
			patch.signedBy = input.staffId;
		}
		await ensureDb()
			.update(table.nursingCarePlanInstanceTable)
			.set(patch)
			.where(
				and(
					eq(table.nursingCarePlanInstanceTable.id, input.id),
					eq(
						table.nursingCarePlanInstanceTable.hospitalId,
						input.hospitalId
					)
				)
			);
		return input.id;
	}
	const [row] = await ensureDb()
		.insert(table.nursingCarePlanInstanceTable)
		.values({
			hospitalId: input.hospitalId,
			branchId: input.branchId,
			patientId: input.patientId,
			visitId: input.visitId,
			templateId: input.templateId ?? null,
			contentJson: input.contentJson,
			signedAt: input.sign ? new Date() : null,
			signedBy: input.sign ? input.staffId : null
		})
		.returning({ id: table.nursingCarePlanInstanceTable.id });
	if (!row) throw error(500, 'Unable to save care plan');
	return row.id;
}
