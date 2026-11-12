import type { CaseSheetPrintFormatters } from '$lib/util/case-sheet-print-body.util';
import { buildCaseSheetPrintBodyHtml } from '$lib/util/case-sheet-print-body.util';
import type { CaseSheetPrintLabels } from '$lib/util/case-sheet-print-body.util';
import type { PrintFromDocumentMasterOptions } from '$lib/util/document-master-print.util.svelte';
import { formatMenziesTableDateTime } from '$lib/util/menzies-table-datetime.util';

export type CaseSheetDocumentData = {
	chiefComplaintEntries: { id?: number | string; description?: string | null }[];
	patientConditionEntries: { id?: number | string; description?: string | null }[];
	visitDiagnoses: unknown[];
	allergies: unknown[];
	vitals: unknown[];
	orderLines: unknown[];
};

export function buildCaseSheetBodyHtmlFromData(
	labels: CaseSheetPrintLabels,
	formatters: CaseSheetPrintFormatters,
	data: CaseSheetDocumentData
): string {
	return buildCaseSheetPrintBodyHtml({
		labels,
		formatters,
		chiefComplaintEntries: data.chiefComplaintEntries,
		patientConditionEntries: data.patientConditionEntries,
		visitDiagnoses: data.visitDiagnoses as Parameters<
			typeof buildCaseSheetPrintBodyHtml
		>[0]['visitDiagnoses'],
		allergies: data.allergies as Parameters<
			typeof buildCaseSheetPrintBodyHtml
		>[0]['allergies'],
		vitals: data.vitals as Parameters<
			typeof buildCaseSheetPrintBodyHtml
		>[0]['vitals'],
		orderLines: data.orderLines as Parameters<
			typeof buildCaseSheetPrintBodyHtml
		>[0]['orderLines']
	});
}

export function buildCaseSheetDocumentMasterPrintOptions(input: {
	visit: PrintFromDocumentMasterOptions['visit'];
	printBy: string;
	bodyHtml: string;
	labels: {
		title: string;
		visitNo: string;
		patient: string;
		patientCode: string;
		visitDate: string;
		doctor: string;
		generated: string;
	};
}): Omit<
	PrintFromDocumentMasterOptions,
	'hospitalId' | 'documentCode' | 'iframeId'
> {
	const printedAt = formatMenziesTableDateTime(new Date());

	return {
		visit: input.visit,
		printBy: input.printBy,
		extraPlaceholders: {
			'{{print.body_html}}': input.bodyHtml,
			'{{print.datetime}}': printedAt,
			'{{print.label_title}}': input.labels.title,
			'{{print.label_visit_no}}': input.labels.visitNo,
			'{{print.label_patient}}': input.labels.patient,
			'{{print.label_patient_code}}': input.labels.patientCode,
			'{{print.label_visit_date}}': input.labels.visitDate,
			'{{print.label_doctor}}': input.labels.doctor,
			'{{print.label_generated}}': input.labels.generated
		}
	};
}
