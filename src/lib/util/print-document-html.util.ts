/**
 * Builds full HTML for clinical / EMR print and PDF rasterization.
 * Paginated print: table thead (repeating header) + fixed footer in tfoot; @page uses document margins (header/footer stay inside).
 * browser / pdfRaster share the same shell; variant is for callers only.
 */

import caseSheetDocumentCss from '$lib/asset/style/case-sheet-document.css?raw';
import { sanitizeDownloadFileBase } from '$lib/util/print-download-filename.util';

export type PrintDocumentHtmlVariant = 'browser' | 'pdfRaster';

export type PrintDocumentLayoutInput = {
	marginTop?: number | null;
	marginBottom?: number | null;
	marginLeft?: number | null;
	marginRight?: number | null;
	paddingTop?: number | null;
	paddingBottom?: number | null;
	paddingLeft?: number | null;
	paddingRight?: number | null;
	pageSize?: string | null;
	pageOrientation?: string | null;
	showHeader?: boolean | null;
	showFooter?: boolean | null;
};

const CSS_PX_PER_MM = 96 / 25.4;

export function mmToCssPx(mm: number): number {
	return Math.round(mm * CSS_PX_PER_MM);
}

export type PrintPageSpec = {
	widthMm: number;
	heightMm: number;
	widthPx: number;
	jspdfFormat: 'a4' | 'a5' | 'letter' | 'legal';
	orientation: 'portrait' | 'landscape';
};

export function resolvePrintPageSpec(
	setting: PrintDocumentLayoutInput | null
): PrintPageSpec {
	const raw = (setting?.pageSize ?? 'A4').trim();
	const orientation: 'portrait' | 'landscape' =
		setting?.pageOrientation === 'landscape'
			? 'landscape'
			: 'portrait';
	const upper = raw.toUpperCase();
	let widthMm = 210;
	let heightMm = 297;
	let jspdfFormat: PrintPageSpec['jspdfFormat'] = 'a4';

	if (upper === 'A5') {
		widthMm = 148;
		heightMm = 210;
		jspdfFormat = 'a5';
	} else if (upper === 'LETTER') {
		widthMm = 216;
		heightMm = 279;
		jspdfFormat = 'letter';
	} else if (upper === 'LEGAL') {
		widthMm = 216;
		heightMm = 356;
		jspdfFormat = 'legal';
	} else if (raw.includes('mm')) {
		const [wPart, hPart] = raw.split(/\s+/);
		const w = Number.parseFloat(wPart);
		const h = Number.parseFloat(hPart ?? wPart);
		if (Number.isFinite(w)) widthMm = w;
		if (Number.isFinite(h)) heightMm = h;
	}

	if (orientation === 'landscape') {
		[widthMm, heightMm] = [heightMm, widthMm];
	}

	return {
		widthMm,
		heightMm,
		widthPx: mmToCssPx(widthMm),
		jspdfFormat,
		orientation
	};
}

/** Shared print utility CSS for document templates and runtime HTML builders. */
export const PRINT_DOCUMENT_UTILITY_CSS = `
	.meta {
		margin-top: 6px;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 6px 14px;
		font-size: 10px;
	}
	.meta dt { font-weight: 600; }
	.meta dd { margin: 0; font-weight: 500; }
	.cat-block { margin-top: 14px; }
	.cat-title {
		margin: 0 0 6px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		border-left: 3px solid #000;
		padding-left: 8px;
	}
	.line-table { width: 100%; border-collapse: collapse; font-size: 10px; }
	.line-table th,
	.line-table td { padding: 6px 8px; border: 1px solid #000; }
	.line-table th.num,
	.line-table td.amt { text-align: right; }
	.billing-line-table { table-layout: fixed; width: 100%; }
	.billing-line-table th,
	.billing-line-table td { overflow: hidden; overflow-wrap: anywhere; vertical-align: top; }
	.billing-line-table th.num,
	.billing-line-table td.num { text-align: right; white-space: nowrap; }
	.subtotal-row td { font-weight: 600; }
	.grand {
		margin-top: 12px;
		padding-top: 10px;
		border-top: 2px solid #000;
		display: flex;
		justify-content: flex-end;
		align-items: baseline;
		gap: 12px;
	}
	.grand--stack { flex-direction: column; align-items: stretch; gap: 4px; }
	.grand-row { display: flex; justify-content: flex-end; gap: 12px; }
	.grand-amt { font-size: 15px; font-weight: 700; }
	.grand-amt--strike { text-decoration: line-through; opacity: 0.7; font-size: 12px; }
	.grand-disc { font-weight: 700; }
	.foot,
	.print-doc-footer,
	.appt-foot,
	.label-foot {
		margin-top: 12px;
		padding-top: 8px;
		border-top: 1px solid #000;
		font-size: 9px;
		display: flex;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}
	.label-foot,
	.appt-foot { justify-content: flex-end; border-top: none; margin-top: 4px; padding-top: 0; }
	.print-doc-header {
		margin-bottom: 8px;
		padding-bottom: 6px;
		border-bottom: 1px solid #000;
		font-size: 11px;
	}
	.label-header {
		display: flex;
		align-items: center;
		gap: 8px;
		border-bottom: 1px solid #000;
		padding-bottom: 6px;
		margin-bottom: 6px;
	}
	.label-logo { width: 72px; height: auto; max-height: 28px; object-fit: contain; }
	.label-header h1 { margin: 0; font-size: 12px; font-weight: 700; }
	.label-rows { display: flex; flex-direction: column; gap: 3px; font-size: 9px; }
	.label-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		column-gap: 10px;
	}
	.label-row .pair { min-width: 0; display: flex; gap: 4px; }
	.label-row .pair.right { padding-left: 6px; }
	.label-row .k { font-weight: 600; }
	.label-row .v { font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
	.barcode-wrap {
		margin-top: 6px;
		display: flex;
		justify-content: center;
		width: 100%;
	}
	svg#visit-label-barcode { max-width: 100%; height: auto; }
	.appt-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding-bottom: 10px;
		border-bottom: 1px solid #000;
		margin-bottom: 10px;
	}
	.appt-header .logo { width: 140px; max-width: 45%; height: auto; object-fit: contain; }
	.appt-header .title { font-size: 18px; font-weight: 700; margin: 0; }
	.appt-header .sub { margin: 2px 0 0; font-size: 11px; }
	.appt-table { width: 100%; border-collapse: collapse; }
	.appt-table td {
		padding: 8px 10px;
		border: 1px solid #000;
		vertical-align: top;
		font-size: 11px;
	}
	.appt-table td.label { width: 28%; font-weight: 700; }
	.receipt-table { width: 100%; border-collapse: collapse; font-size: 11px; }
	.receipt-table th,
	.receipt-table td { border: 1px solid #000; padding: 4px; text-align: left; }
	.receipt-totals { margin-top: 8px; font-size: 11px; font-weight: 600; }
	.meta-line { margin-bottom: 8px; font-size: 11px; }
	.case-sheet-doc-title {
		margin: 0 0 10px;
		font-size: 16px;
		font-weight: 700;
	}
	${caseSheetDocumentCss}
	.catalog-section-title {
		margin: 14px 0 8px;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		border-bottom: 1px solid #000;
		padding-bottom: 4px;
	}
	.catalog-print-footer {
		margin-top: 18px;
		padding-top: 8px;
		border-top: 1px solid #ccc;
		font-size: 9px;
		color: #333;
		display: flex;
		justify-content: space-between;
	}
	.catalog-finance-table { margin-top: 12px; }
	.clinical-form-title {
		margin: 0 0 10px;
		font-size: 15px;
		font-weight: 700;
		text-align: center;
	}
	.clinical-form-meta { margin-bottom: 14px; }
	.clinical-form-body { margin-top: 10px; font-size: 11px; line-height: 1.45; }
	.clinical-form-paragraph { margin: 0 0 10px; }
	.clinical-form-field-label {
		margin: 10px 0 4px;
		font-size: 10px;
		font-weight: 600;
	}
	.clinical-form-line {
		border-bottom: 1px solid #000;
		min-height: 18px;
		margin-bottom: 6px;
	}
	.clinical-form-checkbox-row {
		margin: 6px 0;
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}
	.clinical-form-checkbox {
		display: inline-block;
		width: 12px;
		height: 12px;
		border: 1px solid #000;
		flex-shrink: 0;
		margin-top: 2px;
	}
	.clinical-form-signatures {
		margin-top: 18px;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 16px;
	}
	.clinical-form-signature-label {
		margin: 0 0 4px;
		font-size: 10px;
		font-weight: 600;
	}
	.clinical-form-signature-line {
		border-bottom: 1px solid #000;
		min-height: 28px;
	}
	.clinical-form-signature-date {
		margin: 6px 0 0;
		font-size: 9px;
	}
`;

/** Drop embedded letterhead in template body when hospital layout header is active. */
export function preprocessDocumentBodyForLayout(
	documentHtml: string,
	opts: { layoutHeaderHtml: string; showLayoutHeader: boolean }
): string {
	if (!opts.showLayoutHeader || !opts.layoutHeaderHtml.trim()) {
		return documentHtml;
	}
	return documentHtml
		.replace(
			/<header\s+class="print-doc-header"[^>]*>[\s\S]*?<\/header>\s*/gi,
			''
		)
		.trim();
}

export function buildPrintDocumentHtml(params: {
	documentHtml: string;
	documentTitle: string;
	/** Overrides default basename derived from `documentTitle`. */
	downloadFileBase?: string;
	headerHtml: string;
	footerHtml: string;
	setting: PrintDocumentLayoutInput | null;
	variant: PrintDocumentHtmlVariant;
}): string {
	const {
		documentHtml,
		documentTitle,
		downloadFileBase,
		headerHtml,
		footerHtml,
		setting,
		variant
	} = params;

	const marginTop = setting?.marginTop ?? 20;
	const marginBottom = setting?.marginBottom ?? 20;
	const marginLeft = setting?.marginLeft ?? 15;
	const marginRight = setting?.marginRight ?? 15;
	const paddingTop = setting?.paddingTop ?? 10;
	const paddingBottom = setting?.paddingBottom ?? 10;
	const paddingLeft = setting?.paddingLeft ?? 10;
	const paddingRight = setting?.paddingRight ?? 10;
	const pageSpec = resolvePrintPageSpec(setting);
	const downloadBase = sanitizeDownloadFileBase(
		downloadFileBase ?? documentTitle
	);
	const pageSizeCss =
		(setting?.pageSize ?? 'A4').includes('mm') ||
		(setting?.pageSize ?? 'A4').includes('in')
			? (setting?.pageSize ?? 'A4')
			: `${setting?.pageSize ?? 'A4'} ${pageSpec.orientation}`;
	const showHeader = setting?.showHeader ?? true;
	const showFooter =
		(setting?.showFooter ?? false) && Boolean(footerHtml?.trim());
	const hasLayoutHeader = showHeader && Boolean(headerHtml?.trim());

	// Header chrome comes only from the Document Setting. Never invent a
	// Document Name header: preview and print must show the document HTML.
	const headerBlock = hasLayoutHeader
		? `<div class="print-header"><div class="header-table">${headerHtml}</div></div>`
		: '';

	const footerBlock =
		showFooter && footerHtml
			? `<div class="print-footer print-chrome-bottom">${footerHtml}</div>`
			: '';

	const hasPrintChrome = Boolean(headerBlock || footerBlock);
	const footerReserveMm = showFooter && footerBlock ? 30 : 0;
	const pageMarginPrint = `${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm`;

	const chromeLayoutCss = hasPrintChrome
		? `
					.print-layout-table {
						width: 100%;
						table-layout: fixed;
						border-collapse: collapse;
						border-spacing: 0;
						margin: 0;
						padding: 0;
					}
					.print-layout-table > thead {
						display: table-header-group;
					}
					.print-layout-table > tfoot {
						display: table-footer-group;
					}
					.print-layout-header-cell {
						vertical-align: top;
						padding: 0 0 4mm 0;
					}
					.print-body-slot {
						box-sizing: border-box;
					}
					.print-layout-footer-cell {
						height: ${footerReserveMm}mm;
						padding: 0;
						vertical-align: top;
					}
					.print-chrome-bottom {
						box-sizing: border-box;
						padding: 2mm ${paddingRight}mm ${paddingBottom}mm ${paddingLeft}mm;
						background: #fff;
					}`
		: '';

	const printChromeBlock = hasPrintChrome
		? `
						html,
						body {
							width: 100%;
							height: 100%;
						}
						.print-body-slot {
							padding-bottom: ${paddingBottom + footerReserveMm}mm;
						}
						.print-layout-table > tfoot {
							height: ${footerReserveMm}mm;
						}
						.print-layout-table .content table > tfoot {
							height: auto;
						}
						.print-chrome-bottom {
							position: fixed;
							bottom: 0;
							left: 0;
							right: 0;
							width: 100%;
							z-index: 2;
							min-height: 24mm;
						}`
		: '';

	const pageHeightPx = mmToCssPx(pageSpec.heightMm);
	const screenPreviewChrome = hasPrintChrome
		? `
						html[data-print-preview="1"] .print-preview-sheet .print-body-slot {
							/* The tfoot below already reserves the footer band. */
							padding-bottom: 0;
						}
						html[data-print-preview="1"] .print-preview-sheet .print-layout-table > tfoot {
							height: ${footerReserveMm}mm;
						}
						html[data-print-preview="1"] .print-preview-sheet .print-layout-table > tfoot .print-chrome-bottom {
							position: absolute;
							left: ${marginLeft}mm;
							right: ${marginRight}mm;
							bottom: ${marginBottom}mm;
							width: auto;
							z-index: 2;
							min-height: 24mm;
						}`
		: '';

	const screenPreviewBlock = `
					@media screen {
						html[data-print-preview="1"] {
							background: #d4d4d8;
						}
						html[data-print-preview="1"] body {
							margin: 0;
							padding: 16px 0 24px;
							background: #d4d4d8;
						}
						html[data-print-preview="1"] .print-preview-stack {
							display: flex;
							flex-direction: column;
							align-items: center;
							gap: 20px;
						}
						html[data-print-preview="1"] .print-preview-sheet {
							box-sizing: border-box;
							position: relative;
							width: ${pageSpec.widthPx}px;
							height: ${pageHeightPx}px;
							padding: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
							overflow: hidden;
							background: #fff;
							box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08);
						}
						html[data-print-preview="1"] .print-preview-sheet > .print-page {
							box-sizing: border-box;
							width: 100% !important;
							max-width: none !important;
							height: 100%;
							margin: 0 !important;
							padding: 0 !important;
						}
						html[data-print-preview="1"] .print-preview-sheet .print-surface {
							box-sizing: border-box;
							height: 100%;
							/* Vertical padding belongs to the first/last fragment only,
							   exactly like the fragmented .print-surface in print. */
							padding: 0 ${paddingRight}mm 0 ${paddingLeft}mm;
						}
						html[data-print-preview="1"] .print-preview-sheet[data-preview-first="1"] .print-surface {
							padding-top: ${paddingTop}mm;
						}
						html[data-print-preview="1"] .print-preview-sheet[data-preview-last="1"] .print-surface {
							padding-bottom: ${paddingBottom}mm;
						}
						${screenPreviewChrome}
					}`;

	const printMediaBlock = `
					@media print {
						* {
							print-color-adjust: exact;
							-webkit-print-color-adjust: exact;
						}
						@page {
							size: ${pageSizeCss};
							margin: ${pageMarginPrint};
						}
						.print-page {
							width: auto;
							max-width: none;
							padding: 0;
						}
						.print-surface {
							padding: ${paddingTop}mm ${paddingRight}mm ${paddingBottom}mm ${paddingLeft}mm;
						}
						${printChromeBlock}
						.content > * {
							break-inside: auto;
							page-break-inside: auto;
						}
					}`;

	const bodyContent = documentHtml || '<p>No content</p>';
	const inner = hasPrintChrome
		? `<table class="print-layout-table">
				${headerBlock ? `<thead><tr><td class="print-layout-cell print-layout-header-cell">${headerBlock}</td></tr></thead>` : ''}
				<tbody><tr><td class="print-layout-cell"><div class="print-body-slot"><div class="content">${bodyContent}</div></div></td></tr></tbody>
				${footerBlock ? `<tfoot><tr><td class="print-layout-cell print-layout-footer-cell">${footerBlock}</td></tr></tfoot>` : ''}
			</table>`
		: `<div class="content">${bodyContent}</div>`;

	return `<!DOCTYPE html>
			<html
				data-print-variant="${variant}"
				data-print-chrome="${hasPrintChrome ? '1' : '0'}"
				data-jspdf-format="${pageSpec.jspdfFormat}"
				data-jspdf-orientation="${pageSpec.orientation}"
				data-capture-width-px="${pageSpec.widthPx}"
				data-page-width-mm="${pageSpec.widthMm}"
				data-page-height-mm="${pageSpec.heightMm}"
				data-margin-top-mm="${marginTop}"
				data-margin-bottom-mm="${marginBottom}"
				data-margin-left-mm="${marginLeft}"
				data-margin-right-mm="${marginRight}"
				data-padding-top-mm="${paddingTop}"
				data-padding-bottom-mm="${paddingBottom}"
				data-padding-left-mm="${paddingLeft}"
				data-padding-right-mm="${paddingRight}"
				data-download-filename="${escapeHtml(downloadBase)}"
			>
			<head>
				<meta charset="utf-8"/>
				<title>${escapeHtml(downloadBase)}</title>
				<style>
					body {
						font-family: system-ui, -apple-system, Segoe UI, Arial, sans-serif;
						margin: 0;
						padding: 0;
						line-height: 1.6;
						background: #fff;
						color: #000;
					}
					.print-page {
						box-sizing: border-box;
						width: ${pageSpec.widthPx}px;
						max-width: 100%;
						margin: 0 auto;
						padding: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
						background: #fff;
					}
					.print-surface {
						box-sizing: border-box;
						padding: ${paddingTop}mm ${paddingRight}mm ${paddingBottom}mm ${paddingLeft}mm;
					}
					td.print-layout-cell {
						border: none;
						padding: 0;
						vertical-align: top;
					}
					${chromeLayoutCss}
					.print-header {
						text-align: left;
						padding: 0 0 8px 0;
					}
					.header-table {
						margin-bottom: 6px;
					}
					.document-name {
						font-weight: 600;
						font-size: 14px;
					}
					.content {
						margin: 0;
					}
					.print-footer {
						text-align: left;
						font-size: 10px;
						padding: 10px 0 12px 0;
					}
					.content table {
						width: 100%;
						border-collapse: collapse;
					}
					.content th,
					.content td {
						border: 1px solid #000;
						padding: 4px 6px;
						text-align: left;
						vertical-align: top;
					}
					.content thead th {
						font-weight: 600;
					}
					${PRINT_DOCUMENT_UTILITY_CSS}
					${screenPreviewBlock}
					${printMediaBlock}
				</style>
			</head>
			<body>
				<div class="print-page">
					<div class="print-surface">${inner}</div>
				</div>
			</body>
			</html>`;
}

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
