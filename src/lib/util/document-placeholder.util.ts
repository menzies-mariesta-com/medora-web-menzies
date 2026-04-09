export type PlaceholderItem = {
	key: string;
	desc: string;
};

export type PlaceholderGroup = {
	category: string;
	placeholders: PlaceholderItem[];
};

export const DOCUMENT_TEMPLATE_PLACEHOLDERS: PlaceholderGroup[] = [
	{
		category: 'Patient',
		placeholders: [
			{ key: '{{patient.name}}', desc: 'Full patient name' },
			{ key: '{{patient.code}}', desc: 'Patient code/ID' },
			{ key: '{{patient.dob}}', desc: 'Date of birth' },
			{ key: '{{patient.age}}', desc: 'Patient age (years)' },
			{ key: '{{patient.gender}}', desc: 'Gender' },
			{ key: '{{patient.address}}', desc: 'Patient address' },
			{ key: '{{patient.phone}}', desc: 'Phone number' },
			{
				key: '{{patient.email}}',
				desc: 'Email address (if available)'
			}
		]
	},
	{
		category: 'Visit',
		placeholders: [
			{ key: '{{visit.no}}', desc: 'Visit number' },
			{ key: '{{visit.date}}', desc: 'Visit date' },
			{ key: '{{visit.time}}', desc: 'Visit time' },
			{ key: '{{visit.datetime}}', desc: 'Visit date and time' },
			{ key: '{{visit.type}}', desc: 'Visit type (OPD/IPD/ED)' },
			{ key: '{{visit.department}}', desc: 'Department/branch name' },
			{
				key: '{{visit.service_lines_table}}',
				desc: 'HTML table of service order lines for this visit (when loaded for print)'
			}
		]
	},
	{
		category: 'Doctor',
		placeholders: [
			{ key: '{{doctor.name}}', desc: 'Doctor full name' },
			{ key: '{{doctor.title}}', desc: 'Doctor title' },
			{ key: '{{doctor.specialty}}', desc: 'Specialty' },
			{ key: '{{doctor.license}}', desc: 'License number' },
			{ key: '{{doctor.signature}}', desc: 'Signature text' }
		]
	},
	{
		category: 'Hospital',
		placeholders: [
			{ key: '{{hospital.name}}', desc: 'Hospital name' },
			{ key: '{{hospital.logo}}', desc: 'Hospital logo URL' },
			{ key: '{{hospital.address}}', desc: 'Hospital address' },
			{ key: '{{hospital.phone}}', desc: 'Hospital phone' },
			{ key: '{{hospital.email}}', desc: 'Hospital email' }
		]
	},
	{
		category: 'Document / Print',
		placeholders: [
			{ key: '{{document.title}}', desc: 'Document title' },
			{ key: '{{document.code}}', desc: 'Document code' },
			{ key: '{{document.number}}', desc: 'Document number/name' },
			{ key: '{{document.date}}', desc: 'Document date (today)' },
			{ key: '{{print.date}}', desc: 'Print date (today)' },
			{ key: '{{print.time}}', desc: 'Print time (now)' },
			{ key: '{{print.by}}', desc: 'Printed by user name' },
			{ key: '{{page.number}}', desc: 'Current page number' },
			{ key: '{{page.total}}', desc: 'Total pages' }
		]
	},
	{
		category: 'Legacy aliases',
		placeholders: [
			{ key: '{{patient_name}}', desc: 'Alias of {{patient.name}}' },
			{ key: '{{patient_code}}', desc: 'Alias of {{patient.code}}' },
			{ key: '{{patient_dob}}', desc: 'Alias of {{patient.dob}}' },
			{ key: '{{patient_age}}', desc: 'Alias of {{patient.age}}' },
			{
				key: '{{patient_gender}}',
				desc: 'Alias of {{patient.gender}}'
			},
			{ key: '{{doctor}}', desc: 'Alias of {{doctor.name}}' },
			{ key: '{{doctor_name}}', desc: 'Alias of {{doctor.name}}' },
			{ key: '{{visit_no}}', desc: 'Alias of {{visit.no}}' },
			{ key: '{{visit_date}}', desc: 'Alias of {{visit.date}}' },
			{ key: '{{visit_time}}', desc: 'Alias of {{visit.time}}' },
			{
				key: '{{visit_datetime}}',
				desc: 'Alias of {{visit.datetime}}'
			},
			{
				key: '{{hospital_name}}',
				desc: 'Alias of {{hospital.name}}'
			},
			{ key: '{{hospital_logo}}', desc: 'Alias of {{hospital.logo}}' }
		]
	}
];

type NameParts = {
	firstName?: string | null;
	middleName?: string | null;
	lastName?: string | null;
};

/** Visit (+ relations) shape for EMR document placeholders / print UI. */
export type VisitLike = {
	hospitalId?: string | null;
	visitNo?: string | null;
	createdAt?: string | null;
	visitType?: { name?: string | null } | null;
	branch?: { name?: string | null } | null;
	hospital?: {
		name?: string | null;
		logoUrl?: string | null;
		address?: string | null;
		phone?: string | null;
		email?: string | null;
	} | null;
	patient?:
		| (NameParts & {
				id?: string | null;
				code?: string | null;
				dateOfBirth?: string | null;
				gender?: { name?: string | null } | null;
				address?: string | null;
				phonePrimary?: string | null;
				email?: string | null;
		  })
		| null;
	doctor?:
		| (NameParts & {
				title?: { name?: string | null } | null;
				specialization?: { name?: string | null } | null;
				staffDetail?: {
					licenseNo?: string | null;
					signatureText?: string | null;
				} | null;
		  })
		| null;
};

type DocumentLike = {
	documentNumber?: string | null;
	code?: string | null;
	documentType?: { documentType?: string | null } | null;
};

function fullName(name: NameParts | null | undefined): string {
	return [name?.firstName, name?.middleName, name?.lastName]
		.filter((v) => Boolean(v && String(v).trim()))
		.join(' ')
		.trim();
}

function calcAgeLabel(dob: string | null | undefined): string {
	if (!dob) return '';
	const birth = new Date(dob);
	if (Number.isNaN(birth.getTime())) return '';
	const now = new Date();
	let years = now.getFullYear() - birth.getFullYear();
	const monthDiff = now.getMonth() - birth.getMonth();
	if (
		monthDiff < 0 ||
		(monthDiff === 0 && now.getDate() < birth.getDate())
	) {
		years -= 1;
	}
	return years >= 0 ? String(years) : '';
}

export type VisitServiceLinePrintRow = {
	orderNo: string;
	orderDate: string;
	statusLabel: string;
	serviceLabel: string;
	amount: string;
	tax: string;
	unit: string;
	lineTotal: string;
	nursingCompleteTime: string;
	urgent: string;
	instruction: string;
};

function escapeHtmlCell(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Builds an HTML table for {{visit.service_lines_table}} in document templates. */
export function buildVisitServiceLinesTableHtml(
	rows: VisitServiceLinePrintRow[]
): string {
	if (rows.length === 0) {
		return '<p><em>No service lines for this visit.</em></p>';
	}
	const head =
		'<thead><tr>' +
		[
			'Order No',
			'Order Date',
			'Status',
			'Service',
			'Amount',
			'Tax',
			'Unit',
			'Total',
			'Nursing complete',
			'Urgent',
			'Instruction'
		]
			.map((h) => `<th>${escapeHtmlCell(h)}</th>`)
			.join('') +
		'</tr></thead>';
	const bodyRows = rows.map(
		(r) =>
			`<tr><td>${escapeHtmlCell(r.orderNo)}</td><td>${escapeHtmlCell(r.orderDate)}</td><td>${escapeHtmlCell(r.statusLabel)}</td><td>${escapeHtmlCell(r.serviceLabel)}</td><td>${escapeHtmlCell(r.amount)}</td><td>${escapeHtmlCell(r.tax)}</td><td>${escapeHtmlCell(r.unit)}</td><td>${escapeHtmlCell(r.lineTotal)}</td><td>${escapeHtmlCell(r.nursingCompleteTime)}</td><td>${escapeHtmlCell(r.urgent)}</td><td>${escapeHtmlCell(r.instruction)}</td></tr>`
	);
	return `<table>${head}<tbody>${bodyRows.join('')}</tbody></table>`;
}

export function buildDocumentPlaceholderContext(
	visit: VisitLike | null | undefined,
	document: DocumentLike,
	options?: {
		now?: Date;
		printBy?: string | null;
		/** Merged after base map (e.g. {{visit.service_lines_table}} HTML). */
		extraPlaceholders?: Record<string, string>;
	}
): Record<string, string> {
	const now = options?.now ?? new Date();
	const patientName = fullName(visit?.patient);
	const patientCode = visit?.patient?.code ?? '';
	const patientDob = visit?.patient?.dateOfBirth ?? '';
	const patientAge = calcAgeLabel(visit?.patient?.dateOfBirth);
	const patientGender = visit?.patient?.gender?.name ?? '';
	const patientAddress = visit?.patient?.address ?? '';
	const patientPhone = visit?.patient?.phonePrimary ?? '';
	const patientEmail = visit?.patient?.email ?? '';
	const visitNo = visit?.visitNo ?? '';
	const visitDate = visit?.createdAt
		? new Date(visit.createdAt).toLocaleDateString()
		: '';
	const visitTime = visit?.createdAt
		? new Date(visit.createdAt).toLocaleTimeString()
		: '';
	const doctorTitle = visit?.doctor?.title?.name ?? '';
	const doctorNameCore = fullName(visit?.doctor);
	const doctorName = [doctorTitle, doctorNameCore]
		.filter((v) => Boolean(v))
		.join(' ')
		.trim();
	const doctorSpecialty = visit?.doctor?.specialization?.name ?? '';
	const doctorLicense = visit?.doctor?.staffDetail?.licenseNo ?? '';
	const doctorSignature =
		visit?.doctor?.staffDetail?.signatureText ?? '';
	const hospitalName = visit?.hospital?.name ?? '';
	const hospitalLogo = visit?.hospital?.logoUrl ?? '';
	const hospitalAddress = visit?.hospital?.address ?? '';
	const hospitalPhone = visit?.hospital?.phone ?? '';
	const hospitalEmail = visit?.hospital?.email ?? '';
	const documentTitle =
		document.documentNumber ||
		document.documentType?.documentType ||
		'Document';

	const visitDateTime = `${visitDate} ${visitTime}`.trim();
	const printBy = options?.printBy ?? '';

	const base = {
		'{{patient.name}}': patientName,
		'{{patient.code}}': patientCode,
		'{{patient.dob}}': patientDob,
		'{{patient.age}}': patientAge,
		'{{patient.gender}}': patientGender,
		'{{patient.address}}': patientAddress,
		'{{patient.phone}}': patientPhone,
		'{{patient.email}}': patientEmail,
		'{{visit.no}}': visitNo,
		'{{visit.date}}': visitDate,
		'{{visit.time}}': visitTime,
		'{{visit.datetime}}': visitDateTime,
		'{{visit.type}}': visit?.visitType?.name ?? '',
		'{{visit.department}}': visit?.branch?.name ?? '',
		'{{visit.service_lines_table}}': '',
		'{{doctor.name}}': doctorName,
		'{{doctor.title}}': doctorTitle,
		'{{doctor.specialty}}': doctorSpecialty,
		'{{doctor.license}}': doctorLicense,
		'{{doctor.signature}}': doctorSignature,
		'{{hospital.name}}': hospitalName,
		'{{hospital.logo}}': hospitalLogo,
		'{{hospital.address}}': hospitalAddress,
		'{{hospital.phone}}': hospitalPhone,
		'{{hospital.email}}': hospitalEmail,
		'{{document.title}}': documentTitle,
		'{{document.code}}': document.code ?? '',
		'{{document.number}}': document.documentNumber ?? '',
		'{{document.date}}': now.toLocaleDateString(),
		'{{print.date}}': now.toLocaleDateString(),
		'{{print.time}}': now.toLocaleTimeString(),
		'{{print.by}}': printBy,
		'{{page.number}}': '',
		'{{page.total}}': '',

		// Backward-compatible aliases
		'{{patient_name}}': patientName,
		'{{patient_code}}': patientCode,
		'{{patient_dob}}': patientDob,
		'{{patient_age}}': patientAge,
		'{{patient_gender}}': patientGender,
		'{{doctor}}': doctorName,
		'{{doctor_name}}': doctorName,
		'{{visit_no}}': visitNo,
		'{{visit_date}}': visitDate,
		'{{visit_time}}': visitTime,
		'{{visit_datetime}}': visitDateTime,
		'{{hospital_name}}': hospitalName,
		'{{hospital_logo}}': hospitalLogo
	};

	const extra = options?.extraPlaceholders ?? {};
	return { ...base, ...extra };
}

export function resolveDocumentTemplate(
	template: string | null | undefined,
	context: Record<string, string>,
	options?: { stripUnknown?: boolean }
): string {
	if (!template) return '';
	let result = template;
	for (const [key, value] of Object.entries(context)) {
		result = result.split(key).join(value ?? '');
	}
	if (options?.stripUnknown !== false) {
		result = result.replace(/\{\{[^}]+\}\}/g, '');
	}
	return result;
}
