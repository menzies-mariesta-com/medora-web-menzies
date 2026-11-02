import {
	buildCaseSheetOrderFields,
	buildCaseSheetVitalFields,
	caseSheetFieldsToDefinitionListHtml,
	type CaseSheetOrderFieldLabels,
	type CaseSheetVitalFieldLabels
} from '$lib/util/case-sheet-record-fields.util';
import type { PatientDiagnosisListRow } from '$lib/model/type/medora/ui-rows.type';

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

type DiagnosisRow = {
	id?: number | string;
	description?: string | null;
	diagnosisType?: { name?: string | null } | null;
};

type AllergyRow = {
	id?: number | string;
	allergy?: { name?: string | null } | null;
	severity?: { name?: string | null } | null;
	reaction?: string | null;
};

type VitalRow = {
	id?: number | string;
	vitalDateTime?: string | null;
	createdAt?: string | null;
	statusId?: number | null;
	height?: unknown;
	weight?: unknown;
	bmi?: unknown;
	bpSystolic?: unknown;
	bpDiastolic?: unknown;
	pulse?: unknown;
	temperature?: unknown;
	spO2?: unknown;
	respiration?: unknown;
	rbs?: unknown;
	symptom?: unknown;
	description?: string | null;
	remark?: string | null;
};

type OrderLineRow = {
	id?: number | string;
	orderNo?: string | null;
	serviceName?: string | null;
	serviceId?: number | null;
	subCategoryName?: string | null;
	instruction?: string | null;
	serviceAmount?: unknown;
	serviceTaxAmount?: unknown;
	discount?: string | null;
	serviceUnit?: number | null;
	isUrgent?: boolean | null;
	nursingCompleteTime?: string | null;
	statusId?: number | null;
};

type TextRow = {
	id?: number | string;
	description?: string | null;
};

export type CaseSheetPrintLabels = {
	chiefComplaint: string;
	patientCondition: string;
	diagnosis: string;
	diagnosisEmpty: string;
	diagnosisTypeLabel: string;
	allergies: string;
	allergyEmpty: string;
	allergySeverity: string;
	allergyReaction: string;
	vitals: string;
	orderHistory: string;
	service: string;
	serviceAmount: string;
	units: string;
	urgent: string;
	noEntries: string;
	yes: string;
	no: string;
	vitalColDate: string;
	vitalColHeight: string;
	vitalColWeight: string;
	vitalColBmi: string;
	vitalColBp: string;
	vitalColPulse: string;
	vitalColTemp: string;
	vitalColSpo2: string;
	vitalColSymptom: string;
	vitalColRespiration: string;
	vitalColRbs: string;
	vitalColDescription: string;
	vitalColRemark: string;
	vitalColStatus: string;
	orderColOrderNo: string;
	orderColDescription: string;
	orderColSubCategory: string;
	orderColTaxAmount: string;
	orderColDiscount: string;
	orderColNursingComplete: string;
	orderColStatus: string;
};

export type CaseSheetPrintFormatters = {
	formatText: (value: string | null | undefined) => string;
	formatDateTime: (value: string | null | undefined) => string;
	formatVital: (value: unknown) => string;
	formatNumberDisplay: (value: unknown) => string;
	getVitalDisplayDate: (row: VitalRow) => string | null;
	vitalStatusLabel: (row: VitalRow) => string;
	orderStatusLabel: (row: OrderLineRow) => string;
};

function listSection(
	title: string,
	emptyText: string,
	items: TextRow[],
	renderItem: (row: TextRow) => string
): string {
	if (items.length === 0) {
		return `<section class="case-sheet-section"><h3>${escapeHtml(title)}</h3><p class="case-sheet-empty">${escapeHtml(emptyText)}</p></section>`;
	}
	const rows = items
		.map((row) => `<li><div>${renderItem(row)}</div></li>`)
		.join('');
	return `<section class="case-sheet-section"><h3>${escapeHtml(title)}</h3><ol class="case-sheet-list">${rows}</ol></section>`;
}

export function buildCaseSheetPrintBodyHtml(opts: {
	labels: CaseSheetPrintLabels;
	formatters: CaseSheetPrintFormatters;
	chiefComplaintEntries: TextRow[];
	patientConditionEntries: TextRow[];
	visitDiagnoses: DiagnosisRow[];
	allergies: AllergyRow[];
	vitals: VitalRow[];
	orderLines: OrderLineRow[];
}): string {
	const { labels, formatters: fmt } = opts;

	const chiefComplaint = listSection(
		labels.chiefComplaint,
		labels.noEntries,
		opts.chiefComplaintEntries,
		(row) => escapeHtml(fmt.formatText(row.description))
	);

	const patientCondition = listSection(
		labels.patientCondition,
		labels.noEntries,
		opts.patientConditionEntries,
		(row) => escapeHtml(fmt.formatText(row.description))
	);

	const diagnosis =
		opts.visitDiagnoses.length === 0
			? `<section class="case-sheet-section"><h3>${escapeHtml(labels.diagnosis)}</h3><p class="case-sheet-empty">${escapeHtml(labels.diagnosisEmpty)}</p></section>`
			: `<section class="case-sheet-section"><h3>${escapeHtml(labels.diagnosis)}</h3><ol class="case-sheet-list">${opts.visitDiagnoses
					.map((row) => {
						const typeName = row.diagnosisType?.name?.trim();
						const typeSuffix = typeName
							? ` <span class="case-sheet-muted">(${escapeHtml(labels.diagnosisTypeLabel)}: ${escapeHtml(typeName)})</span>`
							: '';
						return `<li><div>${escapeHtml(fmt.formatText(row.description))}${typeSuffix}</div></li>`;
					})
					.join('')}</ol></section>`;

	const allergies =
		opts.allergies.length === 0
			? `<section class="case-sheet-section"><h3>${escapeHtml(labels.allergies)}</h3><p class="case-sheet-empty">${escapeHtml(labels.allergyEmpty)}</p></section>`
			: `<section class="case-sheet-section"><h3>${escapeHtml(labels.allergies)}</h3><ol class="case-sheet-list">${opts.allergies
					.map((row) => {
						const name = escapeHtml(
							fmt.formatText(row.allergy?.name ?? null)
						);
						const severity = escapeHtml(
							fmt.formatText(row.severity?.name ?? null)
						);
						const reaction = escapeHtml(fmt.formatText(row.reaction));
						return `<li><div><strong>${name}</strong> ${escapeHtml(labels.allergySeverity)}: ${severity}; ${escapeHtml(labels.allergyReaction)}: ${reaction}</div></li>`;
					})
					.join('')}</ol></section>`;

	const vitals =
		opts.vitals.length === 0
			? `<section class="case-sheet-section"><h3>${escapeHtml(labels.vitals)}</h3><p class="case-sheet-empty">${escapeHtml(labels.noEntries)}</p></section>`
			: `<section class="case-sheet-section"><h3>${escapeHtml(labels.vitals)}</h3><ol class="case-sheet-records">${opts.vitals
					.map((row) => {
						const vitalLabels: CaseSheetVitalFieldLabels = {
							date: labels.vitalColDate,
							height: labels.vitalColHeight,
							weight: labels.vitalColWeight,
							bmi: labels.vitalColBmi,
							bp: labels.vitalColBp,
							pulse: labels.vitalColPulse,
							temp: labels.vitalColTemp,
							spo2: labels.vitalColSpo2,
							respiration: labels.vitalColRespiration,
							rbs: labels.vitalColRbs,
							symptom: labels.vitalColSymptom,
							description: labels.vitalColDescription,
							remark: labels.vitalColRemark,
							status: labels.vitalColStatus
						};
						const fields = buildCaseSheetVitalFields(
							row as PatientDiagnosisListRow,
							vitalLabels,
							{
								formatText: fmt.formatText,
								formatDateTime: fmt.formatDateTime,
								formatVital: fmt.formatVital,
								formatNumberDisplay: fmt.formatNumberDisplay,
								getVitalDisplayDate: (r) =>
									fmt.getVitalDisplayDate(r),
								statusLabel: (r) => fmt.vitalStatusLabel(r)
							}
						);
						const title = escapeHtml(
							fmt.formatDateTime(fmt.getVitalDisplayDate(row))
						);
						return `<li class="case-sheet-record"><p class="case-sheet-record-title">${title}</p>${caseSheetFieldsToDefinitionListHtml(fields, escapeHtml)}</li>`;
					})
					.join('')}</ol></section>`;

	const orders =
		opts.orderLines.length === 0
			? `<section class="case-sheet-section"><h3>${escapeHtml(labels.orderHistory)}</h3><p class="case-sheet-empty">${escapeHtml(labels.noEntries)}</p></section>`
			: `<section class="case-sheet-section"><h3>${escapeHtml(labels.orderHistory)}</h3><ol class="case-sheet-records">${opts.orderLines
					.map((row) => {
						const orderLabels: CaseSheetOrderFieldLabels = {
							orderNo: labels.orderColOrderNo,
							service: labels.service,
							subCategory: labels.orderColSubCategory,
							instruction: labels.orderColDescription,
							serviceAmount: labels.serviceAmount,
							taxAmount: labels.orderColTaxAmount,
							discount: labels.orderColDiscount,
							units: labels.units,
							urgent: labels.urgent,
							yes: labels.yes,
							no: labels.no,
							nursingComplete: labels.orderColNursingComplete,
							status: labels.orderColStatus
						};
						const fields = buildCaseSheetOrderFields(row, orderLabels, {
							formatText: fmt.formatText,
							formatDateTime: fmt.formatDateTime,
							formatNumberDisplay: fmt.formatNumberDisplay,
							statusLabel: (r) => fmt.orderStatusLabel(r)
						});
						const serviceLabel =
							row.serviceName?.trim() ||
							(row.serviceId != null
								? `Service ${row.serviceId}`
								: '–');
						const title = `${escapeHtml(fmt.formatText(row.orderNo))} · ${escapeHtml(fmt.formatText(serviceLabel))}`;
						return `<li class="case-sheet-record"><p class="case-sheet-record-title">${title}</p>${caseSheetFieldsToDefinitionListHtml(fields, escapeHtml)}</li>`;
					})
					.join('')}</ol></section>`;

	return [
		chiefComplaint,
		patientCondition,
		diagnosis,
		allergies,
		vitals,
		orders
	].join('');
}
