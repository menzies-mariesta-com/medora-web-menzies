import { SurgicalCaseTypeEnum } from '$lib/model/enum/perioperative.enum';
import { saveFormInstance } from '$lib/server/medora/clinical-form/clinical-form.server';
import { getSurgicalCaseById } from './surgical-case.server';

export async function saveProcedureLogForCase(input: {
	hospitalId: string;
	caseId: number;
	valuesJson: Record<string, unknown>;
	staffId?: string | null;
	sign?: boolean;
}) {
	const caseRow = await getSurgicalCaseById({
		hospitalId: input.hospitalId,
		id: input.caseId
	});
	const templateCode =
		caseRow.caseType === SurgicalCaseTypeEnum.CATH_LAB
			? 'procedure_log_cath_v1'
			: caseRow.caseType === SurgicalCaseTypeEnum.ENDOSCOPY
				? 'procedure_log_endoscopy_v1'
				: 'procedure_log_endoscopy_v1';

	return saveFormInstance({
		hospitalId: input.hospitalId,
		visitId: caseRow.visitId,
		surgicalCaseId: input.caseId,
		templateCode,
		contextType: 'procedure_log',
		valuesJson: input.valuesJson,
		sign: input.sign,
		staffId: input.staffId
	});
}

/** Suggested CPOE service names from completed procedure log (billing hook v1). */
export function suggestBillingServiceNamesFromLog(input: {
	caseType: string;
	valuesJson: Record<string, unknown>;
}): string[] {
	const names: string[] = [];
	if (input.caseType === SurgicalCaseTypeEnum.CATH_LAB) {
		names.push('Cath lab procedure');
		const fluoro = input.valuesJson.fluoro_time_min;
		if (fluoro != null && Number(fluoro) > 0) {
			names.push('Fluoroscopy time');
		}
	}
	if (input.caseType === SurgicalCaseTypeEnum.ENDOSCOPY) {
		names.push('Endoscopy procedure');
	}
	return names;
}
