import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { SurgicalCaseStatusTaggingEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { saveFormInstance } from '$lib/server/medora/clinical-form/clinical-form.server';
import { updateCaseStatus } from './surgical-case.server';

/** Save PACU form and advance case to completed when handoff is signed. */
export async function savePacuAndCompleteCase(input: {
	hospitalId: string;
	caseId: number;
	visitId: string;
	valuesJson: Record<string, unknown>;
	staffId: string;
}) {
	const [caseRow] = await ensureDb()
		.select()
		.from(table.surgicalCaseTable)
		.where(
			and(
				eq(table.surgicalCaseTable.id, input.caseId),
				eq(table.surgicalCaseTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!caseRow) throw error(404, 'Surgical case not found');

	await saveFormInstance({
		hospitalId: input.hospitalId,
		visitId: input.visitId,
		surgicalCaseId: input.caseId,
		templateCode: 'pacu_recovery_v1',
		contextType: 'pacu',
		valuesJson: input.valuesJson,
		sign: true,
		staffId: input.staffId
	});

	await updateCaseStatus({
		hospitalId: input.hospitalId,
		caseId: input.caseId,
		statusTaggingId: SurgicalCaseStatusTaggingEnum.COMPLETED,
		staffId: input.staffId
	});

	return { ok: true as const };
}
