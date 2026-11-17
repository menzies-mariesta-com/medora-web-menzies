import { flattenLegacyPlaceholderTokens } from '$lib/model/constant/document-placeholder.registry';
import type { ClinicalDocumentRow } from '$lib/model/type/medora/document-print.type';
import {
	normalizePrintContext,
	resolveDocumentTemplate,
	type VisitLike
} from '$lib/util/document-placeholder.util';
import { resolveDocumentSettingForDoc } from '$lib/util/emr-print-setting.util';
import {
	buildPrintDocumentHtml,
	preprocessDocumentBodyForLayout,
	type PrintDocumentHtmlVariant
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
			'{{visit_service_lines_table}}': params.serviceLinesTableHtml ?? '-'
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
