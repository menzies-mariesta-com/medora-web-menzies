import { flattenLegacyPlaceholderTokens } from '$lib/model/constant/document-placeholder.registry';
import type { ClinicalDocumentRow } from '$lib/model/type/medora/document-print.type';
import type {
	ClinicalFormFieldDef,
	ClinicalFormTemplateSchema
} from '$lib/model/type/medora/clinical-form.type';
import {
	normalizePrintContext,
	resolveDocumentTemplate,
	type VisitLike
} from '$lib/util/document-placeholder.util';
import { resolveDocumentSettingForDoc } from '$lib/util/emr-print-setting.util';
import { parseUtcInstant } from '$lib/util/utc-instant.util';
import {
	buildPrintDocumentHtml,
	escapeHtml,
	preprocessDocumentBodyForLayout,
	type PrintDocumentHtmlVariant,
	type PrintDocumentLayoutInput
} from '$lib/util/print-document-html.util';

export function buildClinicalFormPrintHtml(params: {
	doc: ClinicalDocumentRow;
	visit: VisitLike | null;
	textPlaceholders?: Record<string, string>;
	printBy: string;
	serviceLinesTableHtml?: string;
	variant?: PrintDocumentHtmlVariant;
}): string {
	const context = normalizePrintContext({
		visit: params.visit,
		document: params.doc,
		printBy: params.printBy,
		textPlaceholders: params.textPlaceholders,
		extraPlaceholders: {
			'{{visit_service_lines_table}}':
				params.serviceLinesTableHtml ?? '-'
		}
	});

	const setting = resolveDocumentSettingForDoc(
		params.doc.documentSetting ?? null,
		params.doc
	);

	const headerHtml = resolveDocumentTemplate(
		flattenLegacyPlaceholderTokens(setting?.headerHtml ?? ''),
		context
	).trim();
	const footerHtml = resolveDocumentTemplate(
		flattenLegacyPlaceholderTokens(setting?.footerHtml ?? ''),
		context
	).trim();
	const showLayoutHeader =
		(setting?.showHeader ?? true) && Boolean(headerHtml.trim());
	let documentHtml = resolveDocumentTemplate(
		flattenLegacyPlaceholderTokens(params.doc.documentText ?? ''),
		context
	).trim();
	documentHtml = preprocessDocumentBodyForLayout(documentHtml, {
		layoutHeaderHtml: headerHtml,
		showLayoutHeader
	});

	const documentTitle =
		params.doc.documentNumber ||
		params.doc.documentType?.documentType ||
		'Document';

	return buildPrintDocumentHtml({
		documentHtml,
		documentTitle,
		headerHtml,
		footerHtml,
		setting,
		variant: params.variant ?? 'browser'
	});
}

/** Print input for an MLC record: the stored values, not a document-master row. */
export type MlcPrintInput = {
	formNumber: string | null;
	title: string;
	schema: ClinicalFormTemplateSchema;
	values: Record<string, unknown>;
	signedAt: string | null;
	printBy: string;
};

function formatPrintDateTime(
	value: string | null | undefined
): string {
	if (!value) return '—';
	const parsed = parseUtcInstant(value);
	if (!Number.isFinite(parsed)) return '—';
	return new Date(parsed).toLocaleString();
}

function printCell(value: unknown): string {
	if (value === undefined || value === null) return '—';
	const text = String(value).trim();
	return text === '' ? '—' : escapeHtml(text);
}

function printFieldValue(
	field: ClinicalFormFieldDef,
	values: Record<string, unknown>
): string {
	const raw = values[field.id];
	if (field.type === 'table') {
		const rows = Array.isArray(raw)
			? raw.filter(
					(row): row is Record<string, unknown> =>
						typeof row === 'object' && row !== null
				)
			: [];
		if (rows.length === 0) return '—';
		const columns = field.columns ?? [];
		const head = columns
			.map((c) => `<th>${escapeHtml(c.label)}</th>`)
			.join('');
		const body = rows
			.map(
				(row) =>
					`<tr>${columns
						.map((c) => `<td>${printCell(row[c.id])}</td>`)
						.join('')}</tr>`
			)
			.join('');
		return `<table class="mlc-print-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
	}
	if (
		field.type === 'datetime' ||
		field.type === 'signature_datetime'
	) {
		return formatPrintDateTime(raw == null ? null : String(raw));
	}
	if (field.type === 'boolean') return raw ? 'Yes' : 'No';
	if (field.type === 'enum') {
		const option = (field.options ?? []).find(
			(o) => o.value === String(raw ?? '')
		);
		return printCell(option?.label ?? raw);
	}
	return printCell(raw);
}

function mlcPrintBodyHtml(params: {
	schema: ClinicalFormTemplateSchema;
	values: Record<string, unknown>;
	signedAt: string | null;
}): string {
	const sections = params.schema.sections
		.map((section) => {
			const fields = (section.sectionFields ?? [section]).filter(
				(f) => f.type !== 'section'
			);
			if (fields.length === 0) return '';
			const rows = fields
				.map(
					(field) => `<tr>
				<th>${escapeHtml(field.label)}</th>
				<td>${printFieldValue(field, params.values)}</td>
			</tr>`
				)
				.join('');
			return `<section class="mlc-print-section">
				<h3>${escapeHtml(section.label)}</h3>
				<table class="mlc-print-fields"><tbody>${rows}</tbody></table>
			</section>`;
		})
		.filter(Boolean)
		.join('');

	const reason = String(params.values.addendum_reason ?? '').trim();
	const reasonBlock = reason
		? `<section class="mlc-print-section">
			<h3>Addendum</h3>
			<p>${escapeHtml(reason)}</p>
		</section>`
		: '';

	const signedBlock = params.signedAt
		? `<p class="mlc-print-signed">Signed at ${escapeHtml(
				formatPrintDateTime(params.signedAt)
			)}</p>`
		: `<p class="mlc-print-signed">Unsigned draft — not a legal record.</p>`;

	return `<div class="mlc-print">
		${sections}
		${reasonBlock}
		${signedBlock}
	</div>`;
}

const MLC_PRINT_STYLE = `<style>
	.mlc-print { font-size: 12px; line-height: 1.45; }
	.mlc-print-section { margin-bottom: 14px; }
	.mlc-print-section h3 {
		font-size: 12px; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.04em; border-bottom: 1px solid #999;
		padding-bottom: 3px; margin-bottom: 6px;
	}
	.mlc-print-fields { width: 100%; border-collapse: collapse; }
	.mlc-print-fields th {
		width: 34%; text-align: left; vertical-align: top;
		font-weight: 600; padding: 3px 8px 3px 0;
	}
	.mlc-print-fields td { padding: 3px 0; vertical-align: top; }
	.mlc-print-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
	.mlc-print-table th, .mlc-print-table td {
		border: 1px solid #999; padding: 3px 5px; text-align: left; font-size: 11px;
	}
	.mlc-print-signed { margin-top: 16px; font-style: italic; }
</style>`;

/**
 * Legal record printout for one MLC instance. Uses the shared print shell so
 * page size, margins and letterhead match every other clinical print.
 */
export function buildMlcPrintHtml(
	params: MlcPrintInput & {
		setting?: PrintDocumentLayoutInput | null;
		variant?: PrintDocumentHtmlVariant;
	}
): string {
	const documentTitle = params.formNumber
		? `MLC ${params.formNumber}`
		: params.title;
	return buildPrintDocumentHtml({
		documentHtml: `${MLC_PRINT_STYLE}${mlcPrintBodyHtml(params)}`,
		documentTitle,
		downloadFileBase: documentTitle,
		headerHtml: '',
		footerHtml: '',
		setting: params.setting ?? null,
		variant: params.variant ?? 'browser'
	});
}
