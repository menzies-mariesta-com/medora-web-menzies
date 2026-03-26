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
	const showHeader = setting?.showHeader ?? true;
	const showFooter = setting?.showFooter ?? true;

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
	const pageMarginTop = marginTop + headerSpaceMm;
	const pageMarginBottom = marginBottom + footerSpaceMm;
	const headerSpacerHeight = showHeader ? 130 : 0;
	const footerSpacerHeight = showFooter ? 70 : 0;

	const isPdf = variant === 'pdfRaster';

	const printMediaBlock = isPdf
		? ''
		: `
					@media print {
						* {
							print-color-adjust: exact;
							-webkit-print-color-adjust: exact;
						}
						@page {
							size: ${pageSize} ${orientation};
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
						text-align: center;
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
						text-align: center;
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
