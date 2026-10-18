import { DOCUMENT_PRINT_CODE } from '$lib/model/constant/document-print.constant';
import { DocumentCatalogKindEnum } from '$lib/model/enum/document-catalog.enum';
import type { CatalogTemplateDef } from './document-catalog.types';

/** Transactional prints reference existing seeded document codes and IDs. */
export const TRANSACTIONAL_CATALOG_TEMPLATES: CatalogTemplateDef[] = [
	{
		catalogCode: 'CATALOG_TX_NURSING_COMPLETE',
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Nursing complete print',
		documentTypeId: 2,
		legacyDocumentId: 90001,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.NURSING_COMPLETE,
		defaultDocumentSettingId: 5,
		surfaces: ['print_only'],
		locales: [{ locale: 'en', documentNumber: 'Nursing complete (OP)', documentText: '' }]
	},
	{
		catalogCode: 'CATALOG_TX_OP_BILL',
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'OP bill print',
		documentTypeId: 2,
		legacyDocumentId: 90002,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.OP_BILL,
		defaultDocumentSettingId: 5,
		surfaces: ['print_only'],
		locales: [{ locale: 'en', documentNumber: 'OP Bill', documentText: '' }]
	},
	{
		catalogCode: 'CATALOG_TX_IP_BILL',
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'IP bill print',
		documentTypeId: 2,
		legacyDocumentId: 90007,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.IP_BILL,
		defaultDocumentSettingId: 5,
		surfaces: ['print_only'],
		locales: [{ locale: 'en', documentNumber: 'IP Bill', documentText: '' }]
	},
	{
		catalogCode: 'CATALOG_TX_VISIT_LABEL',
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Visit label',
		documentTypeId: 2,
		legacyDocumentId: 90003,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.VISIT_LABEL,
		defaultDocumentSettingId: 7,
		surfaces: ['print_only'],
		locales: [{ locale: 'en', documentNumber: 'Visit label', documentText: '' }]
	},
	{
		catalogCode: 'CATALOG_TX_IPD_WRISTBAND',
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'IPD wristband',
		documentTypeId: 2,
		legacyDocumentId: 90008,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.IPD_WRISTBAND,
		defaultDocumentSettingId: 7,
		surfaces: ['print_only'],
		locales: [{ locale: 'en', documentNumber: 'IPD Wristband', documentText: '' }]
	},
	{
		catalogCode: 'CATALOG_TX_APPOINTMENT_SLIP',
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Appointment slip',
		documentTypeId: 2,
		legacyDocumentId: 90004,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.APPOINTMENT_SLIP,
		defaultDocumentSettingId: 9,
		surfaces: ['print_only'],
		locales: [{ locale: 'en', documentNumber: 'Appointment slip', documentText: '' }]
	},
	{
		catalogCode: 'CATALOG_TX_MED_ORDER_RECEIPT',
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Medication order receipt',
		documentTypeId: 2,
		legacyDocumentId: 90005,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.MED_ORDER_RECEIPT,
		defaultDocumentSettingId: 5,
		surfaces: ['print_only'],
		locales: [{ locale: 'en', documentNumber: 'Med order receipt', documentText: '' }]
	},
	{
		catalogCode: 'CATALOG_TX_CASE_SHEET',
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Case sheet print',
		documentTypeId: 2,
		legacyDocumentId: 90006,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.CASE_SHEET,
		defaultDocumentSettingId: 5,
		surfaces: ['print_only'],
		locales: [{ locale: 'en', documentNumber: 'Case sheet', documentText: '' }]
	},
	{
		catalogCode: 'CATALOG_TX_DISCHARGE_SUMMARY',
		kind: DocumentCatalogKindEnum.TRANSACTIONAL_PRINT,
		category: 'transactional',
		title: 'Discharge summary print',
		documentTypeId: 2,
		legacyDocumentId: 90009,
		legacyDocumentCode: DOCUMENT_PRINT_CODE.DISCHARGE_SUMMARY,
		defaultDocumentSettingId: 5,
		surfaces: ['print_only'],
		locales: [{ locale: 'en', documentNumber: 'Discharge summary', documentText: '' }]
	}
];
