import { describe, expect, it } from 'vitest';
import { buildPrintDocumentHtml } from '$lib/util/print-document-html.util';
import {
	mmToPreviewPx,
	pageHeightPx,
	parsePrintDocumentPreviewMetaFromHtml
} from '$lib/util/print-document-preview-meta.util';

describe('print document preview meta', () => {
	it('parses shell data-* from buildPrintDocumentHtml output', () => {
		const html = buildPrintDocumentHtml({
			documentHtml: '<p>Body</p>',
			documentTitle: 'T',
			headerHtml: '<span>H</span>',
			footerHtml: '<span>F</span>',
			setting: {
				pageSize: 'A4',
				pageOrientation: 'portrait',
				marginTop: 12,
				marginBottom: 14,
				marginLeft: 10,
				marginRight: 11,
				paddingTop: 8,
				paddingBottom: 9,
				paddingLeft: 7,
				paddingRight: 6,
				showHeader: true,
				showFooter: true
			},
			variant: 'browser'
		});
		const meta = parsePrintDocumentPreviewMetaFromHtml(html);
		expect(meta).not.toBeNull();
		expect(meta?.jspdfFormat).toBe('a4');
		expect(meta?.orientation).toBe('portrait');
		expect(meta?.pageHeightMm).toBe(297);
		expect(meta?.marginTop).toBe(12);
		expect(meta?.hasChrome).toBe(true);
		expect(meta?.captureWidthPx).toBeGreaterThan(700);
		expect(pageHeightPx(meta!)).toBeGreaterThan(1000);
		expect(mmToPreviewPx(10, meta!)).toBeGreaterThan(30);
	});
});