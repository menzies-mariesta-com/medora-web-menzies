function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

type AuditRow = {
	id?: number | string;
	description?: string | null;
	createdBy?: string | null;
	updatedBy?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
};

type DiagnosisRow = AuditRow & {
	diagnosisType?: { name?: string | null } | null;
};

type AllergyRow = AuditRow & {
	allergy?: { name?: string | null } | null;
	severity?: { name?: string | null } | null;
	reaction?: string | null;
};

type VitalRow = AuditRow & {
	vitalDateTime?: string | null;
	height?: unknown;
	weight?: unknown;
	bmi?: unknown;
	bpSystolic?: unknown;
	bpDiastolic?: unknown;
	pulse?: unknown;
	temperature?: unknown;
	spO2?: unknown;
	symptom?: unknown;
};

type OrderLineRow = AuditRow & {
	orderNo?: string | null;
	serviceName?: string | null;
	serviceId?: number | null;
	instruction?: string | null;
	serviceAmount?: unknown;
	serviceUnit?: number | null;
	isUrgent?: boolean | null;
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
	enteredBy: string;
	updatedBy: string;
	on: string;
	vitalColDate: string;
	vitalColHeight: string;
	vitalColWeight: string;
	vitalColBmi: string;
	vitalColBp: string;
	vitalColPulse: string;
	vitalColTemp: string;
	vitalColSpo2: string;
	vitalColSymptom: string;
	orderColOrderNo: string;
	orderColDescription: string;
};

export type CaseSheetPrintFormatters = {
	formatText: (value: string | null | undefined) => string;
	formatDateTime: (value: string | null | undefined) => string;
	formatUserName: (userId: string | null | undefined) => string;
	formatVital: (value: unknown) => string;
	formatNumberDisplay: (value: unknown) => string;
	getVitalDisplayDate: (row: VitalRow) => string | null;
};

function auditLine(
	row: AuditRow,
	labels: CaseSheetPrintLabels,
	fmt: CaseSheetPrintFormatters
): string {
	return `<p class="case-sheet-audit">${escapeHtml(labels.enteredBy)} ${escapeHtml(
		fmt.formatUserName(row.createdBy)
	)} ${escapeHtml(labels.on)} ${escapeHtml(
		fmt.formatDateTime(row.createdAt)
	)} · ${escapeHtml(labels.updatedBy)} ${escapeHtml(
		fmt.formatUserName(row.updatedBy)
	)} ${escapeHtml(labels.on)} ${escapeHtml(
		fmt.formatDateTime(row.updatedAt)
	)}</p>`;
}

function listSection(
	title: string,
	emptyText: string,
	items: AuditRow[],
	renderItem: (row: AuditRow) => string,
	labels: CaseSheetPrintLabels,
	fmt: CaseSheetPrintFormatters
): string {
	if (items.length === 0) {
		return `<section class="case-sheet-section"><h3>${escapeHtml(title)}</h3><p class="case-sheet-empty">${escapeHtml(emptyText)}</p></section>`;
	}
	const rows = items
		.map(
			(row) =>
				`<li><div>${renderItem(row)}</div>${auditLine(row, labels, fmt)}</li>`
		)
		.join('');
	return `<section class="case-sheet-section"><h3>${escapeHtml(title)}</h3><ol class="case-sheet-list">${rows}</ol></section>`;
}

export function buildCaseSheetPrintBodyHtml(opts: {
	labels: CaseSheetPrintLabels;
	formatters: CaseSheetPrintFormatters;
	chiefComplaintEntries: AuditRow[];
	patientConditionEntries: AuditRow[];
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
		(row) => escapeHtml(fmt.formatText(row.description)),
		labels,
		fmt
	);

	const patientCondition = listSection(
		labels.patientCondition,
		labels.noEntries,
		opts.patientConditionEntries,
		(row) => escapeHtml(fmt.formatText(row.description)),
		labels,
		fmt
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
						return `<li><div>${escapeHtml(fmt.formatText(row.description))}${typeSuffix}</div>${auditLine(row, labels, fmt)}</li>`;
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
						return `<li><div><strong>${name}</strong> ${escapeHtml(labels.allergySeverity)}: ${severity}; ${escapeHtml(labels.allergyReaction)}: ${reaction}</div>${auditLine(row, labels, fmt)}</li>`;
					})
					.join('')}</ol></section>`;

	const vitals =
		opts.vitals.length === 0
			? `<section class="case-sheet-section"><h3>${escapeHtml(labels.vitals)}</h3><p class="case-sheet-empty">${escapeHtml(labels.noEntries)}</p></section>`
			: `<section class="case-sheet-section"><h3>${escapeHtml(labels.vitals)}</h3><div class="case-sheet-table-wrap"><table class="case-sheet-table"><thead><tr>
<th>${escapeHtml(labels.vitalColDate)}</th>
<th>${escapeHtml(labels.vitalColHeight)}</th>
<th>${escapeHtml(labels.vitalColWeight)}</th>
<th>${escapeHtml(labels.vitalColBmi)}</th>
<th>${escapeHtml(labels.vitalColBp)}</th>
<th>${escapeHtml(labels.vitalColPulse)}</th>
<th>${escapeHtml(labels.vitalColTemp)}</th>
<th>${escapeHtml(labels.vitalColSpo2)}</th>
<th>${escapeHtml(labels.vitalColSymptom)}</th>
</tr></thead><tbody>${opts.vitals
					.map(
						(row) => `<tr>
<td>${escapeHtml(fmt.formatDateTime(fmt.getVitalDisplayDate(row)))}</td>
<td>${escapeHtml(fmt.formatVital(row.height))}</td>
<td>${escapeHtml(fmt.formatVital(row.weight))}</td>
<td>${escapeHtml(fmt.formatVital(row.bmi))}</td>
<td>${escapeHtml(fmt.formatVital(row.bpSystolic))}/${escapeHtml(fmt.formatVital(row.bpDiastolic))}</td>
<td>${escapeHtml(fmt.formatVital(row.pulse))}</td>
<td>${escapeHtml(fmt.formatVital(row.temperature))}</td>
<td>${escapeHtml(fmt.formatVital(row.spO2))}</td>
<td><div>${escapeHtml(fmt.formatVital(row.symptom))}</div>${auditLine(row, labels, fmt)}</td>
</tr>`
					)
					.join('')}</tbody></table></div></section>`;

	const orders =
		opts.orderLines.length === 0
			? `<section class="case-sheet-section"><h3>${escapeHtml(labels.orderHistory)}</h3><p class="case-sheet-empty">${escapeHtml(labels.noEntries)}</p></section>`
			: `<section class="case-sheet-section"><h3>${escapeHtml(labels.orderHistory)}</h3><div class="case-sheet-table-wrap"><table class="case-sheet-table"><thead><tr>
<th>${escapeHtml(labels.orderColOrderNo)}</th>
<th>${escapeHtml(labels.service)}</th>
<th>${escapeHtml(labels.orderColDescription)}</th>
<th>${escapeHtml(labels.serviceAmount)}</th>
<th>${escapeHtml(labels.units)}</th>
<th>${escapeHtml(labels.urgent)}</th>
</tr></thead><tbody>${opts.orderLines
					.map((row) => {
						const serviceLabel =
							row.serviceName?.trim() ||
							(row.serviceId != null
								? `Service ${row.serviceId}`
								: '–');
						const urgent = row.isUrgent ? labels.yes : labels.no;
						const units =
							row.serviceUnit != null
								? String(row.serviceUnit)
								: '–';
						return `<tr>
<td>${escapeHtml(fmt.formatText(row.orderNo))}</td>
<td>${escapeHtml(fmt.formatText(serviceLabel))}</td>
<td><div>${escapeHtml(fmt.formatText(row.instruction))}</div>${auditLine(row, labels, fmt)}</td>
<td>${escapeHtml(fmt.formatNumberDisplay(row.serviceAmount))}</td>
<td>${escapeHtml(units)}</td>
<td>${escapeHtml(urgent)}</td>
</tr>`;
					})
					.join('')}</tbody></table></div></section>`;

	return [
		chiefComplaint,
		patientCondition,
		diagnosis,
		allergies,
		vitals,
		orders
	].join('');
}
