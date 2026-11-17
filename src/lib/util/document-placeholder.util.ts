import {
	placeholderGroupsForUi,
	syncLegacyPlaceholderContextKeys,
	SYSTEM_DATA_PLACEHOLDER_REGISTRY
} from '$lib/model/constant/document-placeholder.registry';

export type PlaceholderItem = {
	key: string;
	desc: string;
};

export type PlaceholderGroup = {
	category: string;
	placeholders: PlaceholderItem[];
};

/** @deprecated Use placeholderGroupsForUi() from document-placeholder.registry */
export const DOCUMENT_TEMPLATE_PLACEHOLDERS: PlaceholderGroup[] =
	placeholderGroupsForUi();

const PLACEHOLDER_EMPTY = '-';

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

export type DocumentLike = {
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

/** Builds an HTML table for {{visit_service_lines_table}} in document templates. */
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

function orDash(value: string | null | undefined): string {
	const t = value?.trim() ?? '';
	return t === '' ? PLACEHOLDER_EMPTY : t;
}

export function buildDocumentPlaceholderContext(
	visit: VisitLike | null | undefined,
	document: DocumentLike,
	options?: {
		now?: Date;
		printBy?: string | null;
		extraPlaceholders?: Record<string, string>;
	}
): Record<string, string> {
	const now = options?.now ?? new Date();
	const patientName = orDash(fullName(visit?.patient));
	const patientCode = orDash(visit?.patient?.code);
	const patientDob = orDash(visit?.patient?.dateOfBirth);
	const patientAge = orDash(calcAgeLabel(visit?.patient?.dateOfBirth));
	const patientGender = orDash(visit?.patient?.gender?.name);
	const patientAddress = orDash(visit?.patient?.address);
	const patientPhone = orDash(visit?.patient?.phonePrimary);
	const patientEmail = orDash(visit?.patient?.email);
	const visitCode = orDash(visit?.visitNo);
	const visitDate =
		visit?.createdAt != null
			? orDash(new Date(visit.createdAt).toLocaleDateString())
			: PLACEHOLDER_EMPTY;
	const visitTime =
		visit?.createdAt != null
			? orDash(new Date(visit.createdAt).toLocaleTimeString())
			: PLACEHOLDER_EMPTY;
	const doctorTitle = orDash(visit?.doctor?.title?.name);
	const doctorNameCore = fullName(visit?.doctor);
	const doctorName = orDash(
		[doctorTitle !== PLACEHOLDER_EMPTY ? doctorTitle : '', doctorNameCore]
			.filter((v) => v && v !== PLACEHOLDER_EMPTY)
			.join(' ')
			.trim() || doctorNameCore
	);
	const doctorSpecialty = orDash(visit?.doctor?.specialization?.name);
	const doctorLicense = orDash(visit?.doctor?.staffDetail?.licenseNo);
	const doctorSignature = orDash(
		visit?.doctor?.staffDetail?.signatureText
	);
	const hospitalName = orDash(visit?.hospital?.name);
	const hospitalLogo = orDash(visit?.hospital?.logoUrl);
	const hospitalAddress = orDash(visit?.hospital?.address);
	const hospitalPhone = orDash(visit?.hospital?.phone);
	const hospitalEmail = orDash(visit?.hospital?.email);
	const documentTitle = orDash(
		document.documentNumber ||
			document.documentType?.documentType ||
			'Document'
	);

	const visitDateTime =
		visitDate === PLACEHOLDER_EMPTY && visitTime === PLACEHOLDER_EMPTY
			? PLACEHOLDER_EMPTY
			: `${visitDate === PLACEHOLDER_EMPTY ? '' : visitDate} ${visitTime === PLACEHOLDER_EMPTY ? '' : visitTime}`.trim() ||
				PLACEHOLDER_EMPTY;
	const printBy = orDash(options?.printBy);

	return {
		'{{patient_name}}': patientName,
		'{{patient_code}}': patientCode,
		'{{patient_dob}}': patientDob,
		'{{patient_age}}': patientAge,
		'{{patient_gender}}': patientGender,
		'{{patient_address}}': patientAddress,
		'{{patient_phone}}': patientPhone,
		'{{patient_email}}': patientEmail,
		'{{visit_code}}': visitCode,
		'{{visit_date}}': visitDate,
		'{{visit_time}}': visitTime,
		'{{visit_datetime}}': visitDateTime,
		'{{visit_type}}': orDash(visit?.visitType?.name),
		'{{visit_department}}': orDash(visit?.branch?.name),
		'{{visit_service_lines_table}}': PLACEHOLDER_EMPTY,
		'{{doctor_name}}': doctorName,
		'{{doctor_title}}': doctorTitle,
		'{{doctor_specialty}}': doctorSpecialty,
		'{{doctor_license}}': doctorLicense,
		'{{doctor_signature}}': doctorSignature,
		'{{hospital_name}}': hospitalName,
		'{{hospital_logo}}': hospitalLogo,
		'{{hospital_address}}': hospitalAddress,
		'{{hospital_phone}}': hospitalPhone,
		'{{hospital_email}}': hospitalEmail,
		'{{document_title}}': documentTitle,
		'{{document_code}}': orDash(document.code),
		'{{document_number}}': orDash(document.documentNumber),
		'{{document_date}}': orDash(now.toLocaleDateString()),
		'{{print_date}}': orDash(now.toLocaleDateString()),
		'{{print_time}}': orDash(now.toLocaleTimeString()),
		'{{print_by}}': printBy,
		'{{print_body_html}}': PLACEHOLDER_EMPTY,
		'{{print_barcode_html}}': PLACEHOLDER_EMPTY,
		'{{print_datetime}}': orDash(now.toLocaleString()),
		'{{appointment_patient}}': PLACEHOLDER_EMPTY,
		'{{appointment_doctor}}': PLACEHOLDER_EMPTY,
		'{{appointment_date}}': PLACEHOLDER_EMPTY,
		'{{appointment_start_time}}': PLACEHOLDER_EMPTY,
		'{{appointment_end_time}}': PLACEHOLDER_EMPTY,
		'{{page_number}}': PLACEHOLDER_EMPTY,
		'{{page_total}}': PLACEHOLDER_EMPTY,
		'{{bill_care_setting}}': PLACEHOLDER_EMPTY,
		...options?.extraPlaceholders
	};
}

export type NormalizePrintContextInput = {
	visit?: VisitLike | null;
	document: DocumentLike;
	printBy?: string | null;
	extraPlaceholders?: Record<string, string>;
	textPlaceholders?: Record<string, string>;
	now?: Date;
};

/** Full map for resolveDocumentTemplate: system data + hospital text tokens. */
export function normalizePrintContext(
	input: NormalizePrintContextInput
): Record<string, string> {
	const dashMap: Record<string, string> = {};
	for (const entry of SYSTEM_DATA_PLACEHOLDER_REGISTRY) {
		dashMap[entry.token] = PLACEHOLDER_EMPTY;
	}

	const fromVisit = buildDocumentPlaceholderContext(
		input.visit ?? null,
		input.document,
		{
			now: input.now,
			printBy: input.printBy,
			extraPlaceholders: input.extraPlaceholders
		}
	);

	const merged = { ...dashMap, ...fromVisit };
	for (const [code, text] of Object.entries(input.textPlaceholders ?? {})) {
		const key = code.startsWith('{{') ? code : `{{${code}}}`;
		merged[key] = orDash(text);
	}
	syncLegacyPlaceholderContextKeys(merged, PLACEHOLDER_EMPTY);
	return merged;
}

export function resolveDocumentTemplate(
	template: string | null | undefined,
	context: Record<string, string>,
	options?: { stripUnknown?: boolean }
): string {
	if (!template) return '';
	let result = template;
	for (const [key, value] of Object.entries(context)) {
		result = result.split(key).join(value ?? PLACEHOLDER_EMPTY);
	}
	if (options?.stripUnknown === true) {
		result = result.replace(/\{\{[^}]+\}\}/g, PLACEHOLDER_EMPTY);
	} else {
		result = result.replace(/\{\{[a-z][a-z0-9_]*\}\}/g, (token) =>
			context[token] ?? PLACEHOLDER_EMPTY
		);
	}
	return result;
}

/** Canonical token for EMR/billing dynamic print sections (`{{print_body_html}}` in templates). */
export const PRINT_BODY_HTML_TOKEN = '{{print_body_html}}';

export function extraPrintBodyHtml(html: string): Record<string, string> {
	return { [PRINT_BODY_HTML_TOKEN]: html };
}
