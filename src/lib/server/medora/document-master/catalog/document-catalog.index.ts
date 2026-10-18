import { CLINICAL_FORM_CODE } from '$lib/model/constant/document-print.constant';
import { buildClinicalFormDocumentText } from '$lib/util/clinical-form-print-body.util';
import {
	attachMyLocaleStub,
	defineCertificateTemplates,
	defineConsentTemplates,
	defineFinanceTemplates,
	defineFormTemplates
} from './catalog-build.util';
import {
	ADMIN_LEGAL_TITLES,
	CLINICAL_CONSENT_TITLES,
	CERTIFICATE_TITLES,
	DIAGNOSTICS_TITLES,
	EMERGENCY_TITLES,
	FINANCE_TITLES,
	HR_TITLES,
	NURSING_TITLES,
	OBSTETRICS_TITLES,
	PERIOPERATIVE_TITLES,
	PHARMACY_TITLES,
	PROCEDURE_CONSENT_TITLES,
	REGISTRATION_TITLES
} from './catalog-domain-data';
import { TRANSACTIONAL_CATALOG_TEMPLATES } from './catalog-transactional-print';
import type { CatalogTemplateDef } from './document-catalog.types';
import { DocumentCatalogKindEnum } from '$lib/model/enum/document-catalog.enum';

const introHospital =
	'I understand that care will be provided at {{hospital.name}} in accordance with hospital policies and applicable law.';

function legacyClinicalForms(): CatalogTemplateDef[] {
	const map: { code: string; legacyId: number; title: string; docType: number }[] = [
		{
			code: CLINICAL_FORM_CODE.GENERAL_TREATMENT_CONSENT,
			legacyId: 90101,
			title: 'General treatment consent',
			docType: 1
		},
		{
			code: CLINICAL_FORM_CODE.OPD_REGISTRATION_CONSENT,
			legacyId: 90102,
			title: 'OPD registration consent',
			docType: 1
		},
		{
			code: CLINICAL_FORM_CODE.MINOR_GUARDIAN_CONSENT,
			legacyId: 90103,
			title: 'Minor guardian consent',
			docType: 1
		},
		{
			code: CLINICAL_FORM_CODE.VACCINATION_CONSENT,
			legacyId: 90104,
			title: 'Vaccination consent',
			docType: 1
		},
		{
			code: CLINICAL_FORM_CODE.MEDICATION_CONSENT,
			legacyId: 90105,
			title: 'Medication consent',
			docType: 1
		},
		{
			code: CLINICAL_FORM_CODE.PRIVACY_ACKNOWLEDGMENT,
			legacyId: 90106,
			title: 'Privacy acknowledgment',
			docType: 3
		},
		{
			code: CLINICAL_FORM_CODE.FINANCIAL_RESPONSIBILITY,
			legacyId: 90107,
			title: 'Financial responsibility',
			docType: 3
		},
		{
			code: CLINICAL_FORM_CODE.REFUSAL_OF_TREATMENT,
			legacyId: 90108,
			title: 'Refusal of treatment',
			docType: 2
		},
		{
			code: CLINICAL_FORM_CODE.TRANSFER_REFERRAL_CONSENT,
			legacyId: 90109,
			title: 'Transfer referral consent',
			docType: 1
		},
		{
			code: CLINICAL_FORM_CODE.MEDICAL_CERTIFICATE,
			legacyId: 90110,
			title: 'Medical certificate blank',
			docType: 4
		}
	];
	return map.map((row) => ({
		catalogCode: `CATALOG_LEGACY_${row.code}`,
		kind: DocumentCatalogKindEnum.HTML_PRINT,
		category: 'consent_clinical',
		title: row.title,
		legacyDocumentId: row.legacyId,
		legacyDocumentCode: row.code,
		documentTypeId: row.docType,
		defaultDocumentSettingId: 1,
		catalogVersion: 2,
		locales: [
			{
				locale: 'en',
				documentNumber: row.title,
				documentText: buildClinicalFormDocumentText(row.code)
			}
		]
	}));
}

function buildBulkCatalog(): CatalogTemplateDef[] {
	const registration = defineFormTemplates({
		category: 'registration',
		documentTypeId: 2,
		defaultDocumentSettingId: 1,
		prefix: 'REG',
		items: REGISTRATION_TITLES.map((title) => ({
			title,
			intro: `Complete all sections for ${title.toLowerCase()} at {{hospital.name}}.`,
			fields: ['Primary details', 'Additional notes', 'Staff verification']
		}))
	});

	const clinicalConsent = defineConsentTemplates({
		category: 'consent_clinical',
		documentTypeId: 1,
		defaultDocumentSettingId: 1,
		prefix: 'CONSENT',
		items: CLINICAL_CONSENT_TITLES.map((title) => ({
			title,
			intro: `${introHospital} This form applies to: ${title}.`,
			checkboxes: [
				'Risks, benefits, and alternatives have been explained.',
				'I had the opportunity to ask questions.',
				'I consent to the care described above.'
			]
		}))
	});

	const procedureConsent = defineConsentTemplates({
		category: 'consent_procedure',
		documentTypeId: 1,
		defaultDocumentSettingId: 1,
		prefix: 'PROC',
		items: PROCEDURE_CONSENT_TITLES.map((title) => ({
			title,
			intro: `I consent to ${title.toLowerCase()} as explained by my treating team.`,
			checkboxes: [
				'Anesthesia plan discussed (if applicable).',
				'Site and side confirmed when applicable.',
				'Blood product use discussed if applicable.'
			]
		}))
	});

	const nursing = defineFormTemplates({
		category: 'nursing',
		documentTypeId: 2,
		defaultDocumentSettingId: 1,
		prefix: 'NURS',
		items: NURSING_TITLES.map((title) => ({
			title,
			fields: ['Assessment findings', 'Interventions', 'Patient response', 'Nurse signature date']
		}))
	});

	const emergency = defineFormTemplates({
		category: 'emergency',
		documentTypeId: 2,
		defaultDocumentSettingId: 1,
		prefix: 'ED',
		items: EMERGENCY_TITLES.map((title) => ({
			title,
			fields: ['Chief complaint', 'Vitals', 'Disposition', 'Provider notes']
		}))
	});

	const perioperative = defineFormTemplates({
		category: 'perioperative',
		documentTypeId: 2,
		defaultDocumentSettingId: 1,
		prefix: 'OR',
		items: PERIOPERATIVE_TITLES.map((title) => ({
			title,
			fields: ['Procedure', 'Team members', 'Checks completed', 'Time out verified']
		}))
	});

	const obstetrics = defineFormTemplates({
		category: 'obstetrics',
		documentTypeId: 2,
		defaultDocumentSettingId: 1,
		prefix: 'OB',
		items: OBSTETRICS_TITLES.map((title) => ({
			title,
			fields: ['Gestational age', 'Maternal status', 'Fetal status', 'Plan']
		}))
	});

	const diagnostics = defineFormTemplates({
		category: 'diagnostics',
		documentTypeId: 2,
		defaultDocumentSettingId: 1,
		prefix: 'DX',
		items: DIAGNOSTICS_TITLES.map((title) => ({
			title,
			fields: ['Test ordered', 'Clinical indication', 'Specimen / modality', 'Priority']
		}))
	});

	const pharmacy = defineFormTemplates({
		category: 'pharmacy',
		documentTypeId: 2,
		defaultDocumentSettingId: 1,
		prefix: 'RX',
		items: PHARMACY_TITLES.map((title) => ({
			title,
			fields: ['Medication', 'Dose', 'Verification steps', 'Pharmacist notes']
		}))
	});

	const certificates = defineCertificateTemplates({
		prefix: 'CERT',
		items: CERTIFICATE_TITLES.map((title) => ({
			title,
			opening: `This certificate is issued regarding the patient named above for: ${title}.`,
			fields: ['Clinical summary', 'Recommendations', 'Valid period']
		}))
	});

	const finance = defineFinanceTemplates({
		category: 'finance',
		prefix: 'FIN',
		items: FINANCE_TITLES.map((title) => ({
			title,
			intro: `Financial document: ${title}. Charges and coverage rules apply per hospital policy.`
		}))
	});

	const hr = defineFormTemplates({
		category: 'hr',
		documentTypeId: 9,
		defaultDocumentSettingId: 5,
		prefix: 'HR',
		items: HR_TITLES.map((title) => ({
			title,
			fields: ['Employee name', 'Department', 'Exam findings', 'Restrictions']
		}))
	});

	const adminLegal = defineFormTemplates({
		category: 'admin_legal',
		documentTypeId: 10,
		defaultDocumentSettingId: 1,
		prefix: 'LEGAL',
		items: ADMIN_LEGAL_TITLES.map((title) => ({
			title,
			intro: `Administrative / legal form: ${title}.`,
			fields: ['Request details', 'Patient identifier', 'Authorized representative']
		}))
	});

	const bulk = [
		...registration,
		...clinicalConsent,
		...procedureConsent,
		...nursing,
		...emergency,
		...perioperative,
		...obstetrics,
		...diagnostics,
		...pharmacy,
		...certificates,
		...finance,
		...hr,
		...adminLegal,
		...legacyClinicalForms(),
		...TRANSACTIONAL_CATALOG_TEMPLATES
	];

	return bulk.map((t) => {
		if (
			t.category === 'consent_clinical' ||
			t.category === 'finance' ||
			t.catalogCode.startsWith('CATALOG_LEGACY_')
		) {
			return attachMyLocaleStub([t])[0];
		}
		return t;
	});
}

let cached: CatalogTemplateDef[] | null = null;

export function getAllCatalogTemplates(): CatalogTemplateDef[] {
	if (!cached) cached = buildBulkCatalog();
	return cached;
}

export function getCatalogTemplateByCode(
	code: string
): CatalogTemplateDef | undefined {
	return getAllCatalogTemplates().find((t) => t.catalogCode === code);
}
