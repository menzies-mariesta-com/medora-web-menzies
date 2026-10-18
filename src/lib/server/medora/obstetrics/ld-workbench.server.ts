import { error } from '@sveltejs/kit';
import { and, eq, ne, sql } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { LdBoardColumnEnum } from '$lib/model/enum/perioperative.enum';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { saveFormInstance } from '$lib/server/medora/clinical-form/clinical-form.server';
import { createSurgicalCase } from '$lib/server/medora/perioperative/surgical-case.server';

export async function ensureLdEncounter(input: {
	hospitalId: string;
	visitId: string;
}) {
	const existing = await ensureDb().query.ldEncounterTable.findFirst({
		where: (t, { eq }) => eq(t.visitId, input.visitId)
	});
	if (existing) return existing;
	const [visit] = await ensureDb()
		.select({ id: table.patientVisitTable.id })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');
	const [row] = await ensureDb()
		.insert(table.ldEncounterTable)
		.values({
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			boardColumn: LdBoardColumnEnum.ACTIVE_LABOR
		})
		.returning();
	return row!;
}

export async function listLdBoard(input: { hospitalId: string }) {
	return ensureDb()
		.select({
			encounter: table.ldEncounterTable,
			visitNo: table.patientVisitTable.visitNo,
			patientName: sql<string>`concat(${table.patientTable.firstName}, ' ', coalesce(${table.patientTable.lastName}, ''))`
		})
		.from(table.ldEncounterTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.ldEncounterTable.visitId, table.patientVisitTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.patientVisitTable.patientId, table.patientTable.id)
		)
		.where(
			and(
				eq(table.ldEncounterTable.hospitalId, input.hospitalId),
				eq(table.ldEncounterTable.statusId, StatusEnum.ACTIVE),
				ne(
					table.ldEncounterTable.boardColumn,
					LdBoardColumnEnum.POSTPARTUM
				)
			)
		);
}

export async function savePartogramEntry(input: {
	hospitalId: string;
	visitId: string;
	valuesJson: Record<string, unknown>;
	sign?: boolean;
	staffId?: string | null;
}) {
	await ensureLdEncounter(input);
	const instance = await saveFormInstance({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		templateCode: 'ld_partogram_v1',
		contextType: 'partogram',
		valuesJson: input.valuesJson,
		sign: input.sign,
		staffId: input.staffId
	});
	await ensureDb()
		.update(table.ldEncounterTable)
		.set({ partogramFormInstanceId: instance.id })
		.where(eq(table.ldEncounterTable.visitId, input.visitId));
	return instance;
}

export async function saveDeliveryRecord(input: {
	hospitalId: string;
	visitId: string;
	valuesJson: Record<string, unknown>;
	linkCSectionCase?: boolean;
	staffId?: string | null;
}) {
	await ensureLdEncounter(input);
	const instance = await saveFormInstance({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		templateCode: 'ld_delivery_record_v1',
		contextType: 'delivery',
		valuesJson: input.valuesJson,
		sign: true,
		staffId: input.staffId
	});

	let surgicalCaseId: number | null = null;
	const mode = String(input.valuesJson.delivery_mode ?? '');
	if (input.linkCSectionCase && mode === 'c_section') {
		const surgicalCase = await createSurgicalCase({
			hospitalId: input.hospitalId,
			visitId: input.visitId,
			procedureName: 'C-section',
			caseType: 'c_section',
			priority: 'urgent',
			staffId: input.staffId
		});
		surgicalCaseId = surgicalCase.id;
	}

	await ensureDb()
		.update(table.ldEncounterTable)
		.set({
			deliveryFormInstanceId: instance.id,
			boardColumn: LdBoardColumnEnum.DELIVERY,
			surgicalCaseId
		})
		.where(eq(table.ldEncounterTable.visitId, input.visitId));

	return { instance, surgicalCaseId };
}
