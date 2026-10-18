/** Shared HTML fragments for catalog document bodies (print-time placeholders). */

export const CATALOG_PATIENT_HEADER_HTML = `<dl class="meta clinical-form-meta">
<div><dt>Patient name</dt><dd>{{patient.name}}</dd></div>
<div><dt>Patient code</dt><dd>{{patient.code}}</dd></div>
<div><dt>Date of birth</dt><dd>{{patient.dob}}</dd></div>
<div><dt>Age</dt><dd>{{patient.age}}</dd></div>
<div><dt>Gender</dt><dd>{{patient.gender}}</dd></div>
<div><dt>Visit no.</dt><dd>{{visit.no}}</dd></div>
<div><dt>Visit date</dt><dd>{{visit.date}}</dd></div>
<div><dt>Visit type</dt><dd>{{visit.type}}</dd></div>
<div><dt>Department</dt><dd>{{visit.department}}</dd></div>
<div><dt>Attending doctor</dt><dd>{{doctor.name}}</dd></div>
</dl>`;

export function catalogLines(count: number): string {
	return Array.from({ length: count }, () => '<div class="clinical-form-line"></div>').join(
		''
	);
}

export function catalogLabeledLine(label: string): string {
	return `<p class="clinical-form-field-label">${label}</p><div class="clinical-form-line"></div>`;
}

export function catalogCheckboxRow(label: string): string {
	return `<p class="clinical-form-checkbox-row"><span class="clinical-form-checkbox"></span> ${label}</p>`;
}

export function catalogParagraph(text: string): string {
	return `<p class="clinical-form-paragraph">${text}</p>`;
}

export function catalogSectionTitle(title: string): string {
	return `<h3 class="catalog-section-title">${title}</h3>`;
}

export function catalogSignatureBlock(
	rows: { label: string; showDate?: boolean }[]
): string {
	return `<div class="clinical-form-signatures">${rows
		.map(
			(r) =>
				`<div class="clinical-form-signature"><p class="clinical-form-signature-label">${r.label}</p><div class="clinical-form-signature-line"></div>${
					r.showDate !== false
						? '<p class="clinical-form-signature-date">Date: ____________________</p>'
						: ''
				}</div>`
		)
		.join('')}</div>`;
}

export function buildCatalogDocumentShell(bodyHtml: string): string {
	return `<header class="print-doc-header"><strong>{{hospital.name}}</strong><br/>{{hospital.address}} | Tel: {{hospital.phone}}</header>
<h2 class="clinical-form-title">{{document.number}}</h2>
${CATALOG_PATIENT_HEADER_HTML}
<section class="clinical-form-body">${bodyHtml}</section>
<footer class="catalog-print-footer"><span>{{print.date}}</span> · <span>{{print.by}}</span></footer>`;
}

/** Standard consent body from intro + optional checkboxes + notes + signatures */
export function buildStandardConsentBody(input: {
	intro: string;
	checkboxes?: string[];
	extraLines?: string[];
	signatures?: { label: string }[];
}): string {
	const checks = (input.checkboxes ?? []).map(catalogCheckboxRow).join('');
	const extras = (input.extraLines ?? []).join('');
	const sigs = catalogSignatureBlock(
		input.signatures ?? [
			{ label: 'Patient / guardian signature' },
			{ label: 'Witness signature' },
			{ label: 'Provider signature' }
		]
	);
	return `${catalogParagraph(input.intro)}${checks}${extras}${catalogLines(1)}${sigs}`;
}

/** Standard data-collection form */
export function buildStandardFormBody(input: {
	intro?: string;
	fields: string[];
	signatures?: { label: string }[];
}): string {
	const intro = input.intro ? catalogParagraph(input.intro) : '';
	const fields = input.fields.map(catalogLabeledLine).join('');
	const sigs = catalogSignatureBlock(
		input.signatures ?? [{ label: 'Completed by (signature)' }]
	);
	return `${intro}${fields}${catalogLines(1)}${sigs}`;
}

/** Finance-style table shell */
export function buildFinanceAckBody(input: {
	intro: string;
	lineItems?: string[];
}): string {
	const items = (input.lineItems ?? [
		'Service description',
		'Amount',
		'Payment method',
		'Receipt no.'
	])
		.map(catalogLabeledLine)
		.join('');
	return `${catalogParagraph(input.intro)}${items}
<table class="line-table catalog-finance-table"><thead><tr><th>Description</th><th class="num">Amount</th></tr></thead><tbody><tr><td>&nbsp;</td><td class="amt">&nbsp;</td></tr></tbody></table>
${catalogSignatureBlock([{ label: 'Patient / guarantor signature' }, { label: 'Cashier signature' }])}`;
}

/** Certificate letter */
export function buildCertificateBody(input: {
	opening: string;
	fields: string[];
}): string {
	return `${catalogParagraph(input.opening)}
${input.fields.map(catalogLabeledLine).join('')}
${catalogLines(2)}
${catalogSignatureBlock([
	{ label: 'Attending physician signature' },
	{ label: 'Official stamp / license no.', showDate: false }
])}`;
}
