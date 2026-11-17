import { flattenLegacyPlaceholderTokens } from '$lib/model/constant/document-placeholder.registry';
import {
	buildDocumentPlaceholderContext,
	extraPrintBodyHtml,
	resolveDocumentTemplate,
	type DocumentLike
} from '$lib/util/document-placeholder.util';
import {
	buildPrintDocumentHtml,
	preprocessDocumentBodyForLayout,
	type PrintDocumentLayoutInput
} from '$lib/util/print-document-html.util';

const SAMPLE_VISIT = {
	visitNo: 'V-2026-0001',
	createdAt: new Date().toISOString(),
	visitType: { name: 'OPD' },
	branch: { name: 'Main Branch' },
	patient: {
		firstName: 'Jane',
		lastName: 'Doe',
		code: 'P-00042',
		dateOfBirth: '1990-05-12',
		gender: { name: 'Female' },
		address: '123 Sample Street',
		phonePrimary: '+1 555 0100',
		email: 'jane.doe@example.com'
	},
	doctor: {
		firstName: 'John',
		lastName: 'Smith',
		title: { name: 'Dr.' },
		specialization: { name: 'General Medicine' },
		staffDetail: {
			licenseNo: 'LIC-12345',
			signatureText: 'Dr. John Smith'
		}
	},
	hospital: {
		name: 'Sample Hospital',
		logoUrl: '',
		address: '456 Hospital Road',
		phone: '+1 555 0200',
		email: 'info@samplehospital.example'
	}
} as const;

const SAMPLE_DOCUMENT: DocumentLike = {
	documentNumber: 'Sample document',
	documentType: { documentType: 'Form' },
	code: 'SAMPLE_DOC'
};

export function buildSampleDocumentPreviewContext(
	extra?: Record<string, string>
): Record<string, string> {
	return buildDocumentPlaceholderContext(
		SAMPLE_VISIT,
		SAMPLE_DOCUMENT,
		{
			printBy: 'Preview User',
			extraPlaceholders: {
				'{{visit_service_lines_table}}':
					'<table><thead><tr><th>Service</th><th>Amount</th></tr></thead><tbody><tr><td>Sample service</td><td>100.00</td></tr></tbody></table>',
				...extraPrintBodyHtml(
					'<section class="cat-block"><h3 class="cat-title">Sample category</h3><table class="line-table"><thead><tr><th>Service</th><th>Order</th><th class="num">Amount</th></tr></thead><tbody><tr><td>Consultation</td><td>ORD-1</td><td class="amt">50.00</td></tr></tbody></table></section>'
				),
				'{{print_label_patient}}': 'Patient',
				'{{print_label_patient_code}}': 'Patient code',
				'{{print_label_visit_no}}': 'Visit no',
				'{{print_label_date}}': 'Date',
				'{{print_label_doctor}}': 'Doctor',
				'{{print_label_branch}}': 'Branch',
				'{{print_label_thank_you}}': 'Thank you',
				'{{print_label_heading}}': 'Visit label',
				'{{print_label_dob}}': 'DOB',
				'{{print_label_visit_date}}': 'Visit date',
				'{{print_label_title}}': 'Appointment slip',
				'{{print_label_subtitle}}': 'Please arrive 10 minutes early',
				'{{print_label_start_time}}': 'Start',
				'{{print_label_end_time}}': 'End',
				'{{print_customer}}': 'Walk-in customer',
				'{{print_doctor}}': 'Dr. John Smith',
				'{{appointment.patient}}': 'Jane Doe',
				'{{appointment.doctor}}': 'Dr. John Smith',
				'{{appointment.date}}': new Date().toLocaleDateString(),
				'{{appointment.start_time}}': '09:00',
				'{{appointment.end_time}}': '09:30',
				...extra
			}
		}
	);
}

export function buildDocumentMasterPreviewHtml(params: {
	documentHtml: string;
	documentTitle: string;
	headerHtml?: string;
	footerHtml?: string;
	setting: PrintDocumentLayoutInput | null;
	extraPlaceholders?: Record<string, string>;
}): string {
	const context = buildSampleDocumentPreviewContext(
		params.extraPlaceholders
	);
	const headerHtml = resolveDocumentTemplate(
		flattenLegacyPlaceholderTokens(params.headerHtml ?? ''),
		context
	).trim();
	const footerHtml = resolveDocumentTemplate(
		flattenLegacyPlaceholderTokens(params.footerHtml ?? ''),
		context
	).trim();
	const showLayoutHeader =
		(params.setting?.showHeader ?? true) && Boolean(headerHtml.trim());
	let documentHtml = resolveDocumentTemplate(
		flattenLegacyPlaceholderTokens(params.documentHtml),
		context
	).trim();
	documentHtml = preprocessDocumentBodyForLayout(documentHtml, {
		layoutHeaderHtml: headerHtml,
		showLayoutHeader
	});

	return buildPrintDocumentHtml({
		documentHtml,
		documentTitle: params.documentTitle || 'Document',
		headerHtml,
		footerHtml,
		setting: params.setting,
		variant: 'browser'
	});
}
