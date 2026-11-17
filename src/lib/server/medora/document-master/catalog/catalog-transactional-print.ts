import { DOCUMENT_PRINT_CODE } from '$lib/model/constant/document-print.constant';
import { DocumentCatalogKindEnum } from '$lib/model/enum/document-catalog.enum';
import type { CatalogTemplateDef } from './document-catalog.types';
import { TRANSACTIONAL_PRINT_TEMPLATE_BODIES } from './transactional-print-template-bodies';

const P = {
	CLINICAL: 1,
	BILL: 2,
	NURSING: 3,
	CASE: 4,
	DISCHARGE: 5,
	MED: 6,
	APPT: 7,
	LABEL: 8,
	WRIST: 9
} as const;

/** Transactional print catalog entries (HTML copied per hospital on provision). */
export const TRANSACTIONAL_CATALOG_TEMPLATES: CatalogTemplateDef[] = [
	{
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Nursing complete print',
		documentTypeId: P.NURSING,
		legacyDocumentId: 90001,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.NURSING_COMPLETE,
		defaultDocumentSettingId: 5,
		surfaces: ['print_only'],
		locales: [
			{
				locale: 'en',
				documentNumber: 'Nursing complete',
				documentText:
					TRANSACTIONAL_PRINT_TEMPLATE_BODIES[
						DOCUMENT_PRINT_CODE.NURSING_COMPLETE
					]
			}
		]
	},
	{
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Bill print',
		documentTypeId: P.BILL,
		legacyDocumentId: 90002,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.BILL,
		defaultDocumentSettingId: 5,
		surfaces: ['print_only'],
		locales: [
			{
				locale: 'en',
				documentNumber: 'Bill',
				documentText:
					TRANSACTIONAL_PRINT_TEMPLATE_BODIES[DOCUMENT_PRINT_CODE.BILL]
			}
		]
	},
	{
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Visit label',
		documentTypeId: P.LABEL,
		legacyDocumentId: 90003,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.VISIT_LABEL,
		defaultDocumentSettingId: 7,
		surfaces: ['print_only'],
		locales: [
			{
				locale: 'en',
				documentNumber: 'Visit label',
				documentText:
					TRANSACTIONAL_PRINT_TEMPLATE_BODIES[DOCUMENT_PRINT_CODE.VISIT_LABEL]
			}
		]
	},
	{
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'IPD wristband',
		documentTypeId: P.WRIST,
		legacyDocumentId: 90008,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.IPD_WRISTBAND,
		defaultDocumentSettingId: 7,
		surfaces: ['print_only'],
		locales: [
			{
				locale: 'en',
				documentNumber: 'IPD Wristband',
				documentText:
					TRANSACTIONAL_PRINT_TEMPLATE_BODIES[DOCUMENT_PRINT_CODE.IPD_WRISTBAND]
			}
		]
	},
	{
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Appointment slip',
		documentTypeId: P.APPT,
		legacyDocumentId: 90004,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.APPOINTMENT_SLIP,
		defaultDocumentSettingId: 9,
		surfaces: ['print_only'],
		locales: [
			{
				locale: 'en',
				documentNumber: 'Appointment slip',
				documentText:
					TRANSACTIONAL_PRINT_TEMPLATE_BODIES[DOCUMENT_PRINT_CODE.APPOINTMENT_SLIP]
			}
		]
	},
	{
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Medication order receipt',
		documentTypeId: P.MED,
		legacyDocumentId: 90005,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.MED_ORDER_RECEIPT,
		defaultDocumentSettingId: 5,
		surfaces: ['print_only'],
		locales: [
			{
				locale: 'en',
				documentNumber: 'Med order receipt',
				documentText:
					TRANSACTIONAL_PRINT_TEMPLATE_BODIES[
						DOCUMENT_PRINT_CODE.MED_ORDER_RECEIPT
					]
			}
		]
	},
	{
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Case sheet print',
		documentTypeId: P.CASE,
		legacyDocumentId: 90006,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.CASE_SHEET,
		defaultDocumentSettingId: 5,
		surfaces: ['print_only'],
		locales: [
			{
				locale: 'en',
				documentNumber: 'Case sheet',
				documentText:
					TRANSACTIONAL_PRINT_TEMPLATE_BODIES[DOCUMENT_PRINT_CODE.CASE_SHEET]
			}
		]
	},
	{
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Discharge summary print',
		documentTypeId: P.DISCHARGE,
		legacyDocumentId: 90009,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.DISCHARGE_SUMMARY,
		defaultDocumentSettingId: 5,
		surfaces: ['print_only'],
		locales: [
			{
				locale: 'en',
				documentNumber: 'Discharge summary',
				documentText:
					TRANSACTIONAL_PRINT_TEMPLATE_BODIES[
						DOCUMENT_PRINT_CODE.DISCHARGE_SUMMARY
					]
			}
		]
	}
];
