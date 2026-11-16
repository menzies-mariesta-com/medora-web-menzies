import { describe, expect, it } from 'vitest';
import {
	buildPrintDocumentHtml,
	preprocessDocumentBodyForLayout,
	resolvePrintPageSpec
} from '$lib/util/print-document-html.util';

describe('preprocessDocumentBodyForLayout', () => {
	it('removes embedded print-doc-header when layout header is set', () => {
		const body =
			'<header class="print-doc-header"><strong>X</strong></header><p>Body</p>';
		const out = preprocessDocumentBodyForLayout(body, {
			layoutHeaderHtml: '<div>Layout</div>',
			showLayoutHeader: true
		});
		expect(out).toBe('<p>Body</p>');
	});

	it('wraps header and body in table with fixed footer chrome only', () => {
		const html = buildPrintDocumentHtml({
			documentHtml: '<p>Body</p>',
			documentTitle: 'T',
			headerHtml: '<span>H</span>',
			footerHtml: '<span>F</span>',
			setting: { showHeader: true, showFooter: true },
			variant: 'browser'
		});
		expect(html).toContain('print-layout-table');
		expect(html).toContain('print-body-slot');
		expect(html).toContain('table-header-group');
		expect(html).toContain('print-body-slot');
		expect(html).toMatch(/print-layout-header-cell[\s\S]*padding:\s*.*mm/);
		expect(html).toMatch(/\.print-chrome-bottom[\s\S]*position:\s*fixed/);
	});

	it('resolves A4 portrait page spec from layout setting', () => {
		const spec = resolvePrintPageSpec({
			pageSize: 'A4',
			pageOrientation: 'portrait'
		});
		expect(spec.jspdfFormat).toBe('a4');
		expect(spec.orientation).toBe('portrait');
		expect(spec.widthMm).toBe(210);
		expect(spec.widthPx).toBeGreaterThan(780);
	});

	it('keeps body when layout header is off', () => {
		const body = '<header class="print-doc-header">X</header><p>Body</p>';
		expect(
			preprocessDocumentBodyForLayout(body, {
				layoutHeaderHtml: '',
				showLayoutHeader: false
			})
		).toBe(body);
	});
});