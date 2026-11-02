import type { PatientDiagnosisListRow } from '$lib/model/type/medora/ui-rows.type';

export type CaseSheetFieldRow = { label: string; value: string };

export type CaseSheetVitalFieldLabels = {
	date: string;
	height: string;
	weight: string;
	bmi: string;
	bp: string;
	pulse: string;
	temp: string;
	spo2: string;
	respiration: string;
	rbs: string;
	symptom: string;
	description: string;
	remark: string;
};

export type CaseSheetOrderFieldLabels = {
	orderNo: string;
	service: string;
	subCategory: string;
	category: string;
	instruction: string;
	serviceAmount: string;
	taxAmount: string;
	discount: string;
	units: string;
	urgent: string;
	yes: string;
	no: string;
	nursingComplete: string;
};

type VitalFormatters = {
	formatText: (value: string | null | undefined) => string;
	formatDateTime: (value: string | null | undefined) => string;
	formatVital: (value: unknown) => string;
	formatNumberDisplay: (value: unknown) => string;
	getVitalDisplayDate: (row: PatientDiagnosisListRow) => string | null;
};

type OrderRow = {
	orderNo?: string | null;
	serviceName?: string | null;
	serviceId?: number | null;
	subCategoryName?: string | null;
	categoryName?: string | null;
	instruction?: string | null;
	serviceAmount?: unknown;
	serviceTaxAmount?: unknown;
	discount?: string | null;
	serviceUnit?: number | null;
	isUrgent?: boolean | null;
	nursingCompleteTime?: string | null;
	statusId?: number | null;
};

type OrderFormatters = {
	formatText: (value: string | null | undefined) => string;
	formatDateTime: (value: string | null | undefined) => string;
	formatNumberDisplay: (value: unknown) => string;
};

export function formatCaseSheetOrderRecordTitle(
	row: Pick<OrderRow, 'orderNo'>,
	formatText: (value: string | null | undefined) => string
): string {
	return formatText(row.orderNo);
}

export function buildCaseSheetVitalFields(
	row: PatientDiagnosisListRow,
	labels: CaseSheetVitalFieldLabels,
	fmt: VitalFormatters
): CaseSheetFieldRow[] {
	const bp = `${fmt.formatVital(row.bpSystolic)}/${fmt.formatVital(
		row.bpDiastolic
	)}`;
	return [
		{ label: labels.height, value: fmt.formatVital(row.height) },
		{ label: labels.weight, value: fmt.formatVital(row.weight) },
		{ label: labels.bmi, value: fmt.formatVital(row.bmi) },
		{ label: labels.bp, value: bp },
		{ label: labels.pulse, value: fmt.formatVital(row.pulse) },
		{ label: labels.temp, value: fmt.formatVital(row.temperature) },
		{ label: labels.spo2, value: fmt.formatVital(row.spO2) },
		{ label: labels.respiration, value: fmt.formatVital(row.respiration) },
		{ label: labels.rbs, value: fmt.formatVital(row.rbs) },
		{ label: labels.symptom, value: fmt.formatVital(row.symptom) },
		{
			label: labels.description,
			value: fmt.formatText(row.description)
		},
		{ label: labels.remark, value: fmt.formatText(row.remark) }
	];
}

export function buildCaseSheetOrderFields(
	row: OrderRow,
	labels: CaseSheetOrderFieldLabels,
	fmt: OrderFormatters
): CaseSheetFieldRow[] {
	const units =
		row.serviceUnit != null ? String(row.serviceUnit) : fmt.formatText(null);
	const urgent = row.isUrgent ? labels.yes : labels.no;
	const nursingComplete = row.nursingCompleteTime
		? fmt.formatDateTime(row.nursingCompleteTime)
		: fmt.formatText(null);
	const serviceLabel =
		row.serviceName?.trim() ||
		(row.serviceId != null ? `Service ${row.serviceId}` : '–');

	return [
		{ label: labels.service, value: fmt.formatText(serviceLabel) },
		{
			label: labels.subCategory,
			value: fmt.formatText(row.subCategoryName ?? null)
		},
		{
			label: labels.category,
			value: fmt.formatText(row.categoryName ?? null)
		},
		{ label: labels.instruction, value: fmt.formatText(row.instruction) },
		{
			label: labels.serviceAmount,
			value: fmt.formatNumberDisplay(row.serviceAmount)
		},
		{
			label: labels.taxAmount,
			value: fmt.formatNumberDisplay(row.serviceTaxAmount)
		},
		{
			label: labels.discount,
			value: fmt.formatNumberDisplay(row.discount)
		},
		{ label: labels.units, value: units },
		{ label: labels.urgent, value: urgent },
		{ label: labels.nursingComplete, value: nursingComplete }
	];
}

export function caseSheetFieldsToDefinitionListHtml(
	fields: CaseSheetFieldRow[],
	escapeHtml: (text: string) => string
): string {
	const items = fields
		.map(
			(field) =>
				`<div><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(field.value)}</dd></div>`
		)
		.join('');
	return `<dl class="case-sheet-record-dl">${items}</dl>`;
}
