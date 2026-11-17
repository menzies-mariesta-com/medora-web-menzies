import { describe, expect, it } from 'vitest';
import { buildClinicalFormPrintHtml } from '$lib/util/clinical-form-print.util.svelte';
import { buildInventoryReportTableHtml } from '$lib/util/inventory-report-pdf.util';
import { buildOpBillingPrintBodyHtml } from '$lib/util/op-billing-print-table.util';
import { buildPrintDocumentHtml } from '$lib/util/print-document-html.util';

const baseSetting = {
	pageSize: 'A4',
	pageOrientation: 'portrait',
	marginTop: 12,
	marginBottom: 12,
	marginLeft: 10,
	marginRight: 10,
	paddingTop: 8,
	paddingBottom: 8,
	paddingLeft: 8,
	paddingRight: 8,
	showHeader: true,
	showFooter: true
};

function expectSafeDocumentShell(
	html: string,
	opts?: { layoutTable?: boolean }
) {
	expect(html).toContain('<!DOCTYPE html>');
	expect(html).toContain('<div class="print-page">');
	expect(html).toContain('<div class="print-surface">');
	expect(html).toContain('data-jspdf-format');
	expect(html).toContain('data-capture-width-px');

	const hasLayoutTable = html.includes('<table class="print-layout-table">');
	if (opts?.layoutTable === true) {
		expect(hasLayoutTable).toBe(true);
		expect(html).toContain('table-header-group');
		expect(html).toContain('print-layout-header-cell');
		expect(html).toContain('print-chrome-bottom');
		expect(html).toMatch(/@media print[\s\S]*margin:\s*12mm\s+10mm\s+12mm\s+10mm/);
		expect(html).toContain('data-margin-top-mm="12"');
		expect(html).toMatch(/@media print[\s\S]*\.print-chrome-bottom[\s\S]*position:\s*fixed/);
		expect(html).not.toMatch(/\.print-header\s*\{[^}]*position:\s*fixed/);
	}
	if (opts?.layoutTable === false) {
		expect(hasLayoutTable).toBe(false);
	}
}

describe('print shell audit (all Document Master consumers)', () => {
	it('uses table layout + fixed chrome when header or footer is present', () => {
		const html = buildPrintDocumentHtml({
			documentHtml: '<section class="case-sheet-section"><h3>X</h3></section>',
			documentTitle: 'Case sheet',
			headerHtml: '<div>Hospital</div>',
			footerHtml: '<div>Page footer</div>',
			setting: baseSetting,
			variant: 'browser'
		});
		expectSafeDocumentShell(html, { layoutTable: true });
		expect(html).toContain('<tfoot>');
		expect(html).toContain('print-chrome-bottom');
	});

	it('never invents a Document Name header when no header HTML is set', () => {
		const html = buildPrintDocumentHtml({
			documentHtml: '<p>Only body</p>',
			documentTitle: 'Document name',
			headerHtml: '',
			footerHtml: '',
			setting: baseSetting,
			variant: 'browser'
		});
		expect(html).not.toContain('<div class="document-name">');
		expect(html).not.toContain('<div class="print-header">');
		expect(html).not.toContain('print-layout-table');
		expect(html).toContain('Only body');
	});

	it('plain body when header and footer are off', () => {
		const html = buildPrintDocumentHtml({
			documentHtml: '<p>Only body</p>',
			documentTitle: 'Minimal',
			headerHtml: '',
			footerHtml: '',
			setting: { ...baseSetting, showHeader: false, showFooter: false },
			variant: 'browser'
		});
		expectSafeDocumentShell(html, { layoutTable: false });
		expect(html).toContain('<div class="content">');
	});

	it('clinical form print util uses the same shell', () => {
		const html = buildClinicalFormPrintHtml({
			doc: {
				id: 1,
				documentText: '<p class="clinical-form-body">Form</p>',
				documentNumber: 'F-1',
				documentType: { documentType: 'Clinical form' },
				documentSetting: {
					...baseSetting,
					headerHtml: '<span>H</span>',
					footerHtml: '<span>F</span>'
				},
			},
			visit: null,
			printBy: 'Test',
			variant: 'browser'
		});
		expectSafeDocumentShell(html, { layoutTable: true });
	});

	it('pdfRaster variant shares the same shell', () => {
		const browser = buildPrintDocumentHtml({
			documentHtml: '<p>B</p>',
			documentTitle: 'T',
			headerHtml: '<i>H</i>',
			footerHtml: '',
			setting: { ...baseSetting, showFooter: false },
			variant: 'browser'
		});
		const raster = buildPrintDocumentHtml({
			documentHtml: '<p>B</p>',
			documentTitle: 'T',
			headerHtml: '<i>H</i>',
			footerHtml: '',
			setting: { ...baseSetting, showFooter: false },
			variant: 'pdfRaster'
		});
		expect(browser).toContain('print-layout-table');
		expect(raster).toContain('print-layout-table');
	});

	it('layout footer height applies only to shell tfoot, not billing subtotals', () => {
		const body = buildOpBillingPrintBodyHtml({
			groups: [
				{
					subCategoryName: 'DOCTOR FEES | OPD',
					subtotal: 13000,
					lines: [
						{
							serviceName: 'Consultation',
							qty: 1,
							unitPrice: 13000,
							lineTotal: 13000
						}
					]
				}
			],
			grandTotal: 13000,
			discountValue: 0,
			netTotal: 13000,
			hasDiscount: false,
			labels: {
				service: 'Service',
				order: 'Order',
				qty: 'Qty',
				unit: 'Unit',
				unitPrice: 'Unit price',
				amount: 'Amount',
				subtotal: 'Subtotal',
				grandTotal: 'Grand total',
				discount: 'Discount',
				netTotal: 'Net total'
			},
			formatMoney: (n) => String(n)
		});
		const html = buildPrintDocumentHtml({
			documentHtml: body,
			documentTitle: 'Bill',
			headerHtml: '<div>H</div>',
			footerHtml: '<div>F</div>',
			setting: baseSetting,
			variant: 'browser'
		});
		expect(html).not.toMatch(/\.print-layout-table tfoot\s*\{/);
		expect(html).toMatch(/\.print-layout-table > tfoot\s*\{/);
		expect(html).toContain('.print-layout-table .content table > tfoot');
	});

	it('inventory report HTML is standalone and valid for pdf fallback path', () => {
		const html = buildInventoryReportTableHtml({
			title: 'Stock',
			columns: [{ header: 'Item', cell: () => 'x' }],
			rows: [{}]
		});
		expect(html).toContain('<!DOCTYPE html>');
		expect(html).toContain('<table>');
		expect(html).not.toContain('print-layout-table');
		expect(html).toContain('data-jspdf-format');
	});
});