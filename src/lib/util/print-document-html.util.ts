/**
 * Builds full HTML for clinical / EMR print and PDF rasterization.
 * - browser: @media print with fixed header/footer (native print dialog).
 * - pdfRaster: linear layout without fixed positioning (html2canvas-friendly).
 */

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
	.case-sheet-meta-print { margin-bottom: 12px; }
	.case-sheet-section { margin-top: 14px; }
	.case-sheet-section h3 {
		margin: 0 0 8px;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		border-bottom: 1px solid #000;
		padding-bottom: 4px;
	}
	.case-sheet-list { margin: 0; padding-left: 1.25rem; }
	.case-sheet-list li { margin-bottom: 8px; }
	.case-sheet-empty {
		margin: 0;
		font-size: 10px;
		font-style: italic;
	}
	.case-sheet-audit {
		margin: 4px 0 0;
		font-size: 9px;
	}
	.case-sheet-muted { font-size: 10px; }
	.case-sheet-table-wrap { overflow-x: auto; }
	.case-sheet-table { width: 100%; border-collapse: collapse; font-size: 10px; }
	.case-sheet-table th,
	.case-sheet-table td {
		border: 1px solid #000;
		padding: 4px 6px;
		vertical-align: top;
	}
	.case-sheet-table th { font-weight: 600; }
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

export function buildPrintDocumentHtml(params: {
	documentHtml: string;
	documentTitle: string;
	headerHtml: string;
	footerHtml: string;
	setting: PrintDocumentLayoutInput | null;
	variant: PrintDocumentHtmlVariant;
}): string {
	const {
		documentHtml,
		documentTitle,
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
	const pageSize = setting?.pageSize ?? 'A4';
	const orientation = setting?.pageOrientation ?? 'portrait';
	const pageSizeCss =
		pageSize.includes('mm') || pageSize.includes('in')
			? pageSize
			: `${pageSize} ${orientation}`;
	const showHeader = setting?.showHeader ?? true;
	/** Layout footers disabled — avoids duplicate footers and browser URL margin noise. */
	const showFooter = false;
	const plainLayout = !showHeader && !showFooter;

	const headerBlock =
		showHeader && headerHtml
			? `<div class="print-header">
						<div class="header-table">${headerHtml}</div>
						<div class="document-name">${escapeHtml(documentTitle)}</div>
					</div>`
			: showHeader
				? `<div class="print-header"><div class="document-name">${escapeHtml(documentTitle)}</div></div>`
				: '';

	const footerBlock =
		showFooter && footerHtml
			? `<div class="print-footer">${footerHtml}</div>`
			: '';

	const headerSpaceMm = showHeader ? 38 : 0;
	const footerSpaceMm = showFooter ? 22 : 0;
	const pageMarginTop = plainLayout
		? marginTop
		: marginTop + headerSpaceMm;
	const pageMarginBottom = plainLayout
		? marginBottom
		: marginBottom + footerSpaceMm;
	const headerSpacerHeight = showHeader ? 130 : 0;
	const footerSpacerHeight = showFooter ? 70 : 0;

	const isPdf = variant === 'pdfRaster';

	const printMediaBlock =
		isPdf || plainLayout
			? plainLayout && !isPdf
				? `
					@media print {
						* {
							print-color-adjust: exact;
							-webkit-print-color-adjust: exact;
						}
						@page {
							size: ${pageSizeCss};
							margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
						}
					}`
				: ''
			: `
					@media print {
						* {
							print-color-adjust: exact;
							-webkit-print-color-adjust: exact;
						}
						@page {
							size: ${pageSizeCss};
							margin: ${pageMarginTop}mm ${marginRight}mm ${pageMarginBottom}mm ${marginLeft}mm;
						}
						.print-header {
							position: fixed;
							top: 0;
							left: 0;
							right: 0;
							padding: 8mm ${marginRight}mm 10px ${marginLeft}mm;
						}
						.print-footer {
							position: fixed;
							bottom: 0;
							left: 0;
							right: 0;
							padding: 10px ${marginRight}mm 8mm ${marginLeft}mm;
						}
					}`;

	const bodyMinWidth = isPdf
		? 'min-width: 720px; max-width: 800px;'
		: '';

	return `<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8"/>
				<title>${escapeHtml(documentTitle)}</title>
				<style>
					body {
						font-family: 'Roboto', Arial, sans-serif;
						margin: 0;
						padding: ${paddingTop}mm ${paddingRight}mm ${paddingBottom}mm ${paddingLeft}mm;
						line-height: 1.6;
						${bodyMinWidth}
						background: #fff;
						color: #000;
					}
					.header-spacer {
						height: ${headerSpacerHeight}px;
					}
					.footer-spacer {
						height: ${footerSpacerHeight}px;
					}
					.print-header {
						text-align: left;
						padding: 12px 0 10px 0;
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
					table {
						width: 100%;
						border-collapse: collapse;
					}
					th,
					td {
						border: 1px solid #000;
						padding: 4px 6px;
						text-align: left;
						vertical-align: top;
					}
					thead th {
						background-color: #f5f5f5;
						font-weight: 600;
					}
					${PRINT_DOCUMENT_UTILITY_CSS}
					${printMediaBlock}
				</style>
			</head>
			<body>
				${headerBlock}
				${showHeader && !isPdf ? '<div class="header-spacer"></div>' : ''}
				<div class="content">
					${documentHtml || '<p>No content</p>'}
				</div>
				${showFooter && !isPdf ? '<div class="footer-spacer"></div>' : ''}
				${footerBlock}
			</body>
			</html>`;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
