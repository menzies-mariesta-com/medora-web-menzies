import type { DocumentSettingWithRelations } from '$lib/model/type/document-setting.type';
import type { ClinicalDocumentRow } from '$lib/model/type/medora/document-print.type';
import {
	buildDocumentPlaceholderContext,
	resolveDocumentTemplate,
	type VisitLike
} from '$lib/util/document-placeholder.util';
import { resolveDocumentSettingForDoc } from '$lib/util/emr-print-setting.util';
import {
	buildPrintDocumentHtml,
	type PrintDocumentHtmlVariant
} from '$lib/util/print-document-html.util';

export function buildClinicalFormPrintHtml(params: {
	doc: ClinicalDocumentRow;
	visit: VisitLike | null;
	documentSettings: DocumentSettingWithRelations[];
	printBy: string;
	serviceLinesTableHtml?: string;
	variant?: PrintDocumentHtmlVariant;
}): string {
	const context = buildDocumentPlaceholderContext(params.visit, params.doc, {
		printBy: params.printBy,
		extraPlaceholders: {
			'{{visit.service_lines_table}}': params.serviceLinesTableHtml ?? ''
		}
	});

	const setting = resolveDocumentSettingForDoc(
		params.documentSettings,
		params.doc
	);

	const documentHtml = resolveDocumentTemplate(
		params.doc.documentText,
		context
	).trim();
	const headerHtml = resolveDocumentTemplate(
		setting?.headerHtml,
		context
	).trim();
	const footerHtml = resolveDocumentTemplate(
		setting?.footerHtml,
		context
	).trim();

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
