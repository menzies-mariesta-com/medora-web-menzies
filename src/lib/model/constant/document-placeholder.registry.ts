import { DocumentTypeId } from '$lib/model/constant/document-type-id.constant';

export type PlaceholderRegistryEntry = {
	code: string;
	token: string;
	kind: 'data';
	category: string;
	description: string;
	documentTypeIds?: number[];
};

function data(
	code: string,
	category: string,
	description: string,
	documentTypeIds?: number[]
): PlaceholderRegistryEntry {
	return {
		code,
		token: `{{${code}}}`,
		kind: 'data',
		category,
		description,
		documentTypeIds
	};
}

export const SYSTEM_DATA_PLACEHOLDER_REGISTRY: PlaceholderRegistryEntry[] = [
	data('patient_name', 'Patient', 'Full patient name'),
	data('patient_code', 'Patient', 'Patient code'),
	data('patient_dob', 'Patient', 'Date of birth'),
	data('patient_age', 'Patient', 'Age in years'),
	data('patient_gender', 'Patient', 'Gender'),
	data('patient_address', 'Patient', 'Address'),
	data('patient_phone', 'Patient', 'Phone'),
	data('patient_email', 'Patient', 'Email'),
	data('visit_code', 'Visit', 'Visit number'),
	data('visit_date', 'Visit', 'Visit date'),
	data('visit_time', 'Visit', 'Visit time'),
	data('visit_datetime', 'Visit', 'Visit datetime'),
	data('visit_type', 'Visit', 'Visit type (OPD/IPD/ED)'),
	data('visit_department', 'Visit', 'Department / branch'),
	data('visit_service_lines_table', 'Visit', 'Service lines HTML table'),
	data('doctor_name', 'Doctor', 'Doctor full name'),
	data('doctor_title', 'Doctor', 'Title'),
	data('doctor_specialty', 'Doctor', 'Specialty'),
	data('doctor_license', 'Doctor', 'License number'),
	data('doctor_signature', 'Doctor', 'Signature text'),
	data('hospital_name', 'Hospital', 'Hospital name'),
	data('hospital_logo', 'Hospital', 'Logo URL'),
	data('hospital_address', 'Hospital', 'Address'),
	data('hospital_phone', 'Hospital', 'Phone'),
	data('hospital_email', 'Hospital', 'Email'),
	data('document_title', 'Document', 'Document title'),
	data('document_code', 'Document', 'Document code'),
	data('document_number', 'Document', 'Document number / name'),
	data('document_date', 'Document', 'Document date'),
	data('print_date', 'Print', 'Print date'),
	data('print_time', 'Print', 'Print time'),
	data('print_datetime', 'Print', 'Print datetime'),
	data('print_by', 'Print', 'Printed by'),
	data('print_body_html', 'Print', 'Dynamic HTML body', [
		DocumentTypeId.BILL_PRINT,
		DocumentTypeId.NURSING_COMPLETE_PRINT,
		DocumentTypeId.CASE_SHEET_PRINT,
		DocumentTypeId.DISCHARGE_SUMMARY_PRINT
	]),
	data('print_barcode_html', 'Print', 'Barcode HTML'),
	data('page_number', 'Print', 'Page number'),
	data('page_total', 'Print', 'Total pages'),
	data('appointment_patient', 'Appointment', 'Patient label'),
	data('appointment_doctor', 'Appointment', 'Doctor name'),
	data('appointment_date', 'Appointment', 'Appointment date'),
	data('appointment_start_time', 'Appointment', 'Start time'),
	data('appointment_end_time', 'Appointment', 'End time'),
	data('bill_care_setting', 'Billing', 'OP / IP context', [DocumentTypeId.BILL_PRINT])
];

export const SYSTEM_DATA_PLACEHOLDER_CODES = new Set(
	SYSTEM_DATA_PLACEHOLDER_REGISTRY.map((e) => e.code)
);

export function listSystemPlaceholders(): PlaceholderRegistryEntry[] {
	return SYSTEM_DATA_PLACEHOLDER_REGISTRY;
}

export function placeholderGroupsForUi(): {
	category: string;
	placeholders: { key: string; desc: string }[];
}[] {
	const byCat = new Map<string, { key: string; desc: string }[]>();
	for (const e of SYSTEM_DATA_PLACEHOLDER_REGISTRY) {
		const list = byCat.get(e.category) ?? [];
		list.push({ key: e.token, desc: e.description });
		byCat.set(e.category, list);
	}
	return [...byCat.entries()].map(([category, placeholders]) => ({
		category,
		placeholders
	}));
}

const DOT_TO_FLAT: Record<string, string> = {
	'{{patient.name}}': '{{patient_name}}',
	'{{patient.code}}': '{{patient_code}}',
	'{{patient.dob}}': '{{patient_dob}}',
	'{{patient.age}}': '{{patient_age}}',
	'{{patient.gender}}': '{{patient_gender}}',
	'{{patient.address}}': '{{patient_address}}',
	'{{patient.phone}}': '{{patient_phone}}',
	'{{patient.email}}': '{{patient_email}}',
	'{{visit.no}}': '{{visit_code}}',
	'{{visit.date}}': '{{visit_date}}',
	'{{visit.time}}': '{{visit_time}}',
	'{{visit.datetime}}': '{{visit_datetime}}',
	'{{visit.type}}': '{{visit_type}}',
	'{{visit.department}}': '{{visit_department}}',
	'{{visit.service_lines_table}}': '{{visit_service_lines_table}}',
	'{{doctor.name}}': '{{doctor_name}}',
	'{{doctor.title}}': '{{doctor_title}}',
	'{{doctor.specialty}}': '{{doctor_specialty}}',
	'{{doctor.license}}': '{{doctor_license}}',
	'{{doctor.signature}}': '{{doctor_signature}}',
	'{{hospital.name}}': '{{hospital_name}}',
	'{{hospital.logo}}': '{{hospital_logo}}',
	'{{hospital.address}}': '{{hospital_address}}',
	'{{hospital.phone}}': '{{hospital_phone}}',
	'{{hospital.email}}': '{{hospital_email}}',
	'{{document.title}}': '{{document_title}}',
	'{{document.code}}': '{{document_code}}',
	'{{document.number}}': '{{document_number}}',
	'{{document.date}}': '{{document_date}}',
	'{{print.date}}': '{{print_date}}',
	'{{print.time}}': '{{print_time}}',
	'{{print.by}}': '{{print_by}}',
	'{{print.body_html}}': '{{print_body_html}}',
	'{{print.barcode_html}}': '{{print_barcode_html}}',
	'{{print.datetime}}': '{{print_datetime}}',
	'{{appointment.patient}}': '{{appointment_patient}}',
	'{{appointment.doctor}}': '{{appointment_doctor}}',
	'{{appointment.date}}': '{{appointment_date}}',
	'{{appointment.start_time}}': '{{appointment_start_time}}',
	'{{appointment.end_time}}': '{{appointment_end_time}}',
	'{{page.number}}': '{{page_number}}',
	'{{page.total}}': '{{page_total}}',
	'{{patient_name}}': '{{patient_name}}',
	'{{patient_code}}': '{{patient_code}}',
	'{{visit_no}}': '{{visit_code}}',
	'{{visit_date}}': '{{visit_date}}',
	'{{hospital_name}}': '{{hospital_name}}'
};

export function flattenLegacyPlaceholderTokens(html: string): string {
	let out = html;
	for (const [from, to] of Object.entries(DOT_TO_FLAT)) {
		out = out.split(from).join(to);
	}
	return out;
}

/** Callers may pass dotted keys in `extraPlaceholders`; templates use flat `{{print_body_html}}`, etc. */
export function syncLegacyPlaceholderContextKeys(
	context: Record<string, string>,
	emptySentinel = '-'
): void {
	for (const [dot, flat] of Object.entries(DOT_TO_FLAT)) {
		if (dot === flat) continue;
		const dotVal = context[dot];
		if (dotVal == null || dotVal === '' || dotVal === emptySentinel) continue;
		const flatVal = context[flat];
		if (flatVal == null || flatVal === '' || flatVal === emptySentinel) {
			context[flat] = dotVal;
		}
	}
}
