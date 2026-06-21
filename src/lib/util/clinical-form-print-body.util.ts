import { CLINICAL_FORM_CODE } from '$lib/model/constant/document-print.constant';

/** Shared patient/visit header block (placeholders resolved at print time). */
export const CLINICAL_FORM_PATIENT_HEADER_HTML = `<dl class="meta clinical-form-meta">
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

function lines(count: number): string {
	return Array.from({ length: count }, () => '<div class="clinical-form-line"></div>').join('');
}

function labeledLine(label: string): string {
	return `<p class="clinical-form-field-label">${label}</p><div class="clinical-form-line"></div>`;
}

function checkboxRow(label: string): string {
	return `<p class="clinical-form-checkbox-row"><span class="clinical-form-checkbox"></span> ${label}</p>`;
}

function signatureBlock(
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

function consentIntro(text: string): string {
	return `<p class="clinical-form-paragraph">${text}</p>`;
}

function buildFormShell(bodyHtml: string): string {
	return `<header class="print-doc-header"><strong>{{hospital.name}}</strong><br/>{{hospital.address}} | Tel: {{hospital.phone}}</header>
<h2 class="clinical-form-title">{{document.number}}</h2>
${CLINICAL_FORM_PATIENT_HEADER_HTML}
<section class="clinical-form-body">${bodyHtml}</section>`;
}

const FORM_BODIES: Record<string, string> = {
	[CLINICAL_FORM_CODE.GENERAL_TREATMENT_CONSENT]: `
${consentIntro('I hereby authorize the physicians and staff of {{hospital.name}} to perform diagnostic procedures, medical treatment, nursing care, and other services deemed necessary for my evaluation and treatment. I understand the nature of my condition and the proposed care has been explained to me.')}
${checkboxRow('I consent to routine laboratory, imaging, and diagnostic tests as ordered.')}
${checkboxRow('I consent to administration of medications as prescribed.')}
${checkboxRow('I have been given the opportunity to ask questions and my questions have been answered.')}
${labeledLine('Procedure / treatment (if applicable)')}
${lines(2)}
${signatureBlock([
	{ label: 'Patient signature' },
	{ label: 'Witness signature' },
	{ label: 'Physician / provider signature' }
])}`,
	[CLINICAL_FORM_CODE.OPD_REGISTRATION_CONSENT]: `
${consentIntro('I confirm that the registration information provided is accurate. I consent to outpatient evaluation and treatment at {{hospital.name}} for this visit.')}
${labeledLine('Emergency contact name')}
${labeledLine('Emergency contact phone')}
${labeledLine('Relationship to patient')}
${checkboxRow('I authorize the hospital to contact the emergency contact if required.')}
${checkboxRow('I agree to follow outpatient instructions given at discharge.')}
${signatureBlock([{ label: 'Patient signature' }, { label: 'Registration staff signature' }])}`,
	[CLINICAL_FORM_CODE.MINOR_GUARDIAN_CONSENT]: `
${consentIntro('I am the parent / legal guardian of the minor patient named above. I authorize medical evaluation and treatment for the minor during this visit.')}
${labeledLine('Minor patient name (if different from header)')}
${labeledLine('Guardian name')}
${labeledLine('Guardian relationship to patient')}
${labeledLine('Guardian ID / document no.')}
${checkboxRow('I consent to diagnostic tests and treatment as deemed necessary for the minor.')}
${checkboxRow('I consent to vaccination if recommended during this visit (if applicable).')}
${signatureBlock([
	{ label: 'Parent / guardian signature' },
	{ label: 'Witness signature' },
	{ label: 'Physician signature' }
])}`,
	[CLINICAL_FORM_CODE.VACCINATION_CONSENT]: `
${consentIntro('I consent to receive the vaccination(s) listed below. I understand the benefits, risks, and possible side effects have been explained to me.')}
${labeledLine('Vaccine name')}
${labeledLine('Manufacturer / batch no. (to be completed)')}
${labeledLine('Dose no. / route / site')}
${checkboxRow('I confirm I am not currently febrile or acutely ill (unless advised otherwise).')}
${checkboxRow('I confirm allergy history has been reviewed.')}
${labeledLine('Adverse reaction history (if any)')}
${lines(1)}
${signatureBlock([
	{ label: 'Patient / guardian signature' },
	{ label: 'Nurse / vaccinator signature' }
])}`,
	[CLINICAL_FORM_CODE.MEDICATION_CONSENT]: `
${consentIntro('I consent to the administration of medications as prescribed during this visit. I understand the purpose, dosage, and possible side effects have been explained.')}
${labeledLine('Medication name')}
${labeledLine('Dose / route / frequency')}
${labeledLine('Indication')}
${checkboxRow('I agree to report any adverse reaction immediately.')}
${checkboxRow('I confirm current medications and allergies have been reviewed.')}
${lines(2)}
${signatureBlock([
	{ label: 'Patient / guardian signature' },
	{ label: 'Prescriber signature' },
	{ label: 'Nurse signature' }
])}`,
	[CLINICAL_FORM_CODE.PRIVACY_ACKNOWLEDGMENT]: `
${consentIntro('I acknowledge that I have received information regarding how {{hospital.name}} collects, uses, and protects my personal and medical information.')}
${checkboxRow('I understand my information may be shared with authorized healthcare providers involved in my care.')}
${checkboxRow('I understand I may request access to my medical records according to hospital policy.')}
${checkboxRow('I understand I may refuse certain uses of my information as permitted by law.')}
${labeledLine('Additional notes / restrictions (if any)')}
${lines(2)}
${signatureBlock([{ label: 'Patient / representative signature' }])}`,
	[CLINICAL_FORM_CODE.FINANCIAL_RESPONSIBILITY]: `
${consentIntro('I understand that I am financially responsible for charges not covered by my insurance or third-party payers. I agree to pay all applicable fees for services rendered during this visit.')}
${labeledLine('Insurance provider (if any)')}
${labeledLine('Policy / member ID')}
${labeledLine('Guarantor name (if different from patient)')}
${checkboxRow('I authorize release of medical information required for billing and claims processing.')}
${checkboxRow('I agree to pay co-payments, deductibles, and non-covered services at time of service where required.')}
${lines(1)}
${signatureBlock([{ label: 'Patient / guarantor signature' }])}`,
	[CLINICAL_FORM_CODE.REFUSAL_OF_TREATMENT]: `
${consentIntro('I decline the recommended treatment / procedure described below. I understand the risks of refusal, including worsening of my condition, have been explained to me.')}
${labeledLine('Treatment / procedure refused')}
${labeledLine('Reason for refusal')}
${labeledLine('Alternatives offered and discussed')}
${lines(2)}
${signatureBlock([
	{ label: 'Patient signature' },
	{ label: 'Witness signature' },
	{ label: 'Physician signature' }
])}`,
	[CLINICAL_FORM_CODE.TRANSFER_REFERRAL_CONSENT]: `
${consentIntro('I consent to transfer / referral to another facility or specialist for further evaluation and treatment as recommended.')}
${labeledLine('Receiving facility / specialist name')}
${labeledLine('Reason for transfer / referral')}
${labeledLine('Mode of transport (if applicable)')}
${checkboxRow('I consent to transfer of relevant medical records and summary to the receiving provider.')}
${checkboxRow('I understand I may ask questions regarding the transfer plan.')}
${lines(1)}
${signatureBlock([
	{ label: 'Patient / guardian signature' },
	{ label: 'Referring physician signature' }
])}`,
	[CLINICAL_FORM_CODE.MEDICAL_CERTIFICATE]: `
${consentIntro('To whom it may concern,')}
<p class="clinical-form-paragraph">This is to certify that the above-named patient was examined at {{hospital.name}} on {{visit.date}}.</p>
${labeledLine('Diagnosis / clinical impression')}
${lines(2)}
${labeledLine('Recommendation / fitness for work or travel')}
${lines(2)}
${labeledLine('Period of rest / medical leave (from — to)')}
${labeledLine('Additional remarks')}
${lines(2)}
${signatureBlock([
	{ label: 'Attending physician signature' },
	{ label: 'Official stamp / license no.' }
])}`
};

/** Full document_text HTML for a seeded clinical form code. */
export function buildClinicalFormDocumentText(code: string): string {
	const body = FORM_BODIES[code];
	if (!body) {
		throw new Error(`Unknown clinical form code: ${code}`);
	}
	return buildFormShell(body);
}

/** All seeded clinical forms for information-table seed. */
export const CLINICAL_FORM_SEED_ROWS = [
	{
		id: 90101,
		documentTypeId: 1,
		code: CLINICAL_FORM_CODE.GENERAL_TREATMENT_CONSENT,
		documentNumber: 'General Treatment Consent'
	},
	{
		id: 90102,
		documentTypeId: 1,
		code: CLINICAL_FORM_CODE.OPD_REGISTRATION_CONSENT,
		documentNumber: 'OPD Registration Consent'
	},
	{
		id: 90103,
		documentTypeId: 1,
		code: CLINICAL_FORM_CODE.MINOR_GUARDIAN_CONSENT,
		documentNumber: 'Minor Patient Guardian Consent'
	},
	{
		id: 90104,
		documentTypeId: 1,
		code: CLINICAL_FORM_CODE.VACCINATION_CONSENT,
		documentNumber: 'Vaccination Consent'
	},
	{
		id: 90105,
		documentTypeId: 1,
		code: CLINICAL_FORM_CODE.MEDICATION_CONSENT,
		documentNumber: 'Medication Consent'
	},
	{
		id: 90106,
		documentTypeId: 3,
		code: CLINICAL_FORM_CODE.PRIVACY_ACKNOWLEDGMENT,
		documentNumber: 'Privacy / Data Protection Acknowledgment'
	},
	{
		id: 90107,
		documentTypeId: 3,
		code: CLINICAL_FORM_CODE.FINANCIAL_RESPONSIBILITY,
		documentNumber: 'Financial Responsibility Agreement'
	},
	{
		id: 90108,
		documentTypeId: 2,
		code: CLINICAL_FORM_CODE.REFUSAL_OF_TREATMENT,
		documentNumber: 'Refusal of Treatment'
	},
	{
		id: 90109,
		documentTypeId: 1,
		code: CLINICAL_FORM_CODE.TRANSFER_REFERRAL_CONSENT,
		documentNumber: 'Transfer / Referral Consent'
	},
	{
		id: 90110,
		documentTypeId: 4,
		code: CLINICAL_FORM_CODE.MEDICAL_CERTIFICATE,
		documentNumber: 'Medical Certificate (blank)'
	}
] as const;
