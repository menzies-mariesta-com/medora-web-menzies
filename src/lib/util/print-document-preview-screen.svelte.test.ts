import { describe, expect, it } from 'vitest';
import {
	buildPrintDocumentHtml,
	mmToCssPx
} from '$lib/util/print-document-html.util';
import {
	mmToPreviewPx,
	pageHeightPx,
	readPrintDocumentPreviewMeta
} from '$lib/util/print-document-preview-meta.util';
import { mountPrintPreviewInIframe } from '$lib/util/print-document-preview-screen.util';
import { buildDocumentMasterPreviewHtml } from '$lib/util/document-master-preview.util.svelte';

const setting = {
	pageSize: 'A5',
	pageOrientation: 'landscape',
	marginTop: 12,
	marginBottom: 14,
	marginLeft: 10,
	marginRight: 11,
	paddingTop: 8,
	paddingBottom: 9,
	paddingLeft: 7,
	paddingRight: 6,
	showHeader: false,
	showFooter: false
};

function buildHtml(): string {
	const blocks = Array.from(
		{ length: 24 },
		(_, i) => `<p>Block ${i + 1} — preview pagination sample.</p>`
	).join('');
	return buildPrintDocumentHtml({
		documentHtml: blocks,
		documentTitle: 'Preview spec',
		headerHtml: '',
		footerHtml: '',
		setting,
		variant: 'browser'
	});
}

function expectPx(actual: string | undefined, expected: number) {
	expect(actual).toBeTruthy();
	expect(
		Math.abs(Number.parseFloat(actual ?? '0') - expected)
	).toBeLessThan(0.05);
}

/** A4 portrait with layout header + footer, matching the verified print run. */
const chromeSetting = {
	pageSize: 'A4',
	pageOrientation: 'portrait',
	marginTop: 20,
	marginBottom: 20,
	marginLeft: 15,
	marginRight: 15,
	paddingTop: 10,
	paddingBottom: 10,
	paddingLeft: 10,
	paddingRight: 10,
	showHeader: true,
	showFooter: true
};

function longTableBody(): string {
	return `
<h2 class="case-sheet-doc-title">Heading block</h2>
<p>Intro paragraph 001 — the quick brown fox jumps over the lazy dog.</p>
<table class="line-table">
  <thead><tr><th>#</th><th>Item description that is fairly wide</th><th class="num">Amount</th></tr></thead>
  <tbody>
  ${Array.from(
		{ length: 45 },
		(_, i) =>
			`<tr><td>${i + 1}</td><td>Row ${String(i + 1).padStart(3, '0')} description text for pagination comparison</td><td class="num">${(i + 1) * 1250}</td></tr>`
	).join('\n')}
  </tbody>
</table>
<p>Paragraph after the long table 002.</p>
${Array.from(
	{ length: 40 },
	(_, i) =>
		`<p>Paragraph block ${String(i + 3).padStart(3, '0')} — filler text used to push content across page boundaries so the preview and print pagination can be compared exactly.</p>`
).join('\n')}
<h3 class="catalog-section-title">Section near end</h3>
<p>Closing paragraph 099.</p>
`;
}

function buildChromeHtml(body: string, s = chromeSetting): string {
	return buildPrintDocumentHtml({
		documentHtml: body,
		documentTitle: 'Pagination verify',
		headerHtml:
			'<div class="header-table"><div class="document-name">Hospital letterhead</div></div>',
		footerHtml: '<div>Hospital footer — printed on every page</div>',
		setting: s,
		variant: 'browser'
	});
}

async function mount(
	html: string
): Promise<{ iframe: HTMLIFrameElement; sheets: HTMLElement[] }> {
	const iframe = document.createElement('iframe');
	iframe.style.width = '300px';
	iframe.style.height = '150px';
	document.body.appendChild(iframe);
	await mountPrintPreviewInIframe(iframe, html);
	const doc = iframe.contentDocument as Document;
	const sheets = Array.from(
		doc.querySelectorAll<HTMLElement>('.print-preview-sheet')
	);
	return { iframe, sheets };
}

function sheetText(sheet: HTMLElement): string {
	return (sheet.textContent ?? '').replace(/\s+/g, ' ');
}

describe('print preview screen mount', () => {
	it('keeps the footer inside the page margins on every sheet', async () => {
		const html = buildPrintDocumentHtml({
			documentHtml: Array.from(
				{ length: 24 },
				(_, i) => `<p>Block ${i + 1} — footer pagination sample.</p>`
			).join(''),
			documentTitle: 'Preview footer spec',
			headerHtml: '<div>Hospital header</div>',
			footerHtml: '<div>Hospital footer</div>',
			setting: { ...setting, showHeader: true, showFooter: true },
			variant: 'browser'
		});
		const iframe = document.createElement('iframe');
		iframe.style.width = '300px';
		iframe.style.height = '150px';
		document.body.appendChild(iframe);

		try {
			const result = await mountPrintPreviewInIframe(iframe, html);
			const meta = result.meta;
			expect(meta).not.toBeNull();
			if (!meta) return;

			const doc = iframe.contentDocument;
			const sheets = Array.from(
				doc?.querySelectorAll<HTMLElement>('.print-preview-sheet') ??
					[]
			);
			expect(sheets.length).toBe(result.pageCount);
			expect(sheets.length).toBeGreaterThan(1);

			const marginLeft = mmToPreviewPx(meta.marginLeft, meta);
			const marginRight = mmToPreviewPx(meta.marginRight, meta);
			const marginBottom = mmToPreviewPx(meta.marginBottom, meta);

			for (const sheet of sheets) {
				const sheetRect = sheet.getBoundingClientRect();
				const footer = sheet.querySelector<HTMLElement>(
					'.print-chrome-bottom'
				);
				expect(footer).not.toBeNull();
				if (!footer) continue;
				const footerRect = footer.getBoundingClientRect();

				expect(
					Math.abs(footerRect.left - (sheetRect.left + marginLeft))
				).toBeLessThan(1);
				expect(
					Math.abs(
						footerRect.width -
							(sheetRect.width - marginLeft - marginRight)
					)
				).toBeLessThan(1);
				expect(
					Math.abs(
						footerRect.bottom - (sheetRect.bottom - marginBottom)
					)
				).toBeLessThan(1);
				expect(footerRect.top).toBeGreaterThanOrEqual(sheetRect.top);
			}
		} finally {
			iframe.remove();
		}
	});

	it('uses the print page width/height/margins/padding from the HTML', async () => {
		const html = buildHtml();
		const iframe = document.createElement('iframe');
		// Deliberately start with the browser default size. The mount helper
		// must resize before layout/pagination is measured.
		iframe.style.width = '300px';
		iframe.style.height = '150px';
		document.body.appendChild(iframe);

		try {
			const result = await mountPrintPreviewInIframe(iframe, html);
			const meta = result.meta;
			expect(meta).not.toBeNull();
			if (!meta) return;

			expect(meta.orientation).toBe('landscape');
			expect(meta.jspdfFormat).toBe('a5');
			expect(result.width).toBe(meta.captureWidthPx);
			expect(iframe.style.width).toBe(`${meta.captureWidthPx}px`);

			const doc = iframe.contentDocument;
			expect(doc).not.toBeNull();
			if (!doc) return;

			expect(
				doc.documentElement.getAttribute('data-print-preview')
			).toBe('1');

			const sheet = doc.querySelector<HTMLElement>(
				'.print-preview-sheet'
			);
			expect(sheet).not.toBeNull();
			if (!sheet) return;

			const sheetStyle = doc.defaultView?.getComputedStyle(sheet);
			expect(sheetStyle?.width).toBe(
				`${mmToCssPx(meta.pageWidthMm)}px`
			);
			expect(
				Math.abs(
					Number.parseFloat(sheetStyle?.height ?? '0') -
						pageHeightPx(meta)
				)
			).toBeLessThan(2);
			expectPx(
				sheetStyle?.paddingTop,
				mmToPreviewPx(meta.marginTop, meta)
			);
			expectPx(
				sheetStyle?.paddingRight,
				mmToPreviewPx(meta.marginRight, meta)
			);
			expectPx(
				sheetStyle?.paddingBottom,
				mmToPreviewPx(meta.marginBottom, meta)
			);
			expectPx(
				sheetStyle?.paddingLeft,
				mmToPreviewPx(meta.marginLeft, meta)
			);

			const surface =
				sheet.querySelector<HTMLElement>('.print-surface');
			const surfaceStyle = surface
				? doc.defaultView?.getComputedStyle(surface)
				: null;
			// Vertical padding belongs to the first/last print fragment only.
			expectPx(
				surfaceStyle?.paddingTop,
				mmToPreviewPx(meta.paddingTop, meta)
			);
			expectPx(
				surfaceStyle?.paddingRight,
				mmToPreviewPx(meta.paddingRight, meta)
			);
			expectPx(surfaceStyle?.paddingBottom, 0);
			expectPx(
				surfaceStyle?.paddingLeft,
				mmToPreviewPx(meta.paddingLeft, meta)
			);

			const sheets = Array.from(
				doc.querySelectorAll<HTMLElement>('.print-preview-sheet')
			);
			const lastSheet = sheets[sheets.length - 1];
			const lastSurface =
				lastSheet.querySelector<HTMLElement>('.print-surface');
			const lastStyle = lastSurface
				? doc.defaultView?.getComputedStyle(lastSurface)
				: null;
			expectPx(
				lastStyle?.paddingBottom,
				mmToPreviewPx(meta.paddingBottom, meta)
			);

			const secondSurface =
				sheets[1]?.querySelector<HTMLElement>('.print-surface');
			const secondStyle = secondSurface
				? doc.defaultView?.getComputedStyle(secondSurface)
				: null;
			expectPx(secondStyle?.paddingTop, 0);

			expect(result.pageCount).toBeGreaterThan(1);
			expect(
				doc.querySelectorAll('.print-preview-sheet').length
			).toBe(result.pageCount);
		} finally {
			iframe.remove();
		}
	});

	// Expectations below were verified against Chromium print-to-PDF output
	// (`preferCSSPageSize: true, printBackground: true`) for the same HTML:
	// the preview must reproduce the same page count and the same content on
	// every page, including split table rows and blank trailing pages.
	it('paginates a fragmented table exactly like Chromium print', async () => {
		const { iframe, sheets } = await mount(
			buildChromeHtml(longTableBody())
		);
		try {
			expect(sheets.length).toBe(6);

			const rowsOf = (sheet: HTMLElement) =>
				Array.from(
					sheet.querySelectorAll(
						'.print-body-slot .content > table tbody tr'
					)
				).map((row) =>
					(row.querySelector('td')?.textContent ?? '').trim()
				);
			// Rows 1-22 fit on page 1; the remaining rows share page 2 with
			// the paragraphs that follow the table.
			expect(rowsOf(sheets[0])).toEqual(
				Array.from({ length: 22 }, (_, i) => String(i + 1))
			);
			expect(rowsOf(sheets[1])).toEqual(
				Array.from({ length: 23 }, (_, i) => String(i + 23))
			);
			expect(rowsOf(sheets[2])).toEqual([]);

			// No row is dropped or duplicated by the split.
			const all = sheets.flatMap(rowsOf);
			expect(all).toHaveLength(45);
			expect(new Set(all).size).toBe(45);

			// Paragraph pages match the printed output.
			expect(sheetText(sheets[1])).toContain('Paragraph block 003');
			expect(sheetText(sheets[1])).not.toContain(
				'Paragraph block 004'
			);
			expect(sheetText(sheets[2])).toContain('Paragraph block 004');
			expect(sheetText(sheets[2])).not.toContain(
				'Paragraph block 016'
			);
			expect(sheetText(sheets[3])).toContain('Paragraph block 016');
			expect(sheetText(sheets[4])).toContain('Paragraph block 028');
			expect(sheetText(sheets[5])).toContain('Paragraph block 040');
			expect(sheetText(sheets[5])).toContain('Closing paragraph 099');
		} finally {
			iframe.remove();
		}
	});

	it('repeats the layout header and truncates the top margin after a break', async () => {
		const { iframe, sheets } = await mount(
			buildChromeHtml(
				Array.from(
					{ length: 80 },
					(_, i) =>
						`<p>Measure paragraph ${String(i + 1).padStart(3, '0')} — filler text used to check where the first line of each preview sheet sits relative to the print page.</p>`
				).join('\n')
			)
		);
		try {
			const doc = iframe.contentDocument as Document;
			const meta = readPrintDocumentPreviewMeta(doc);
			const marginTopPx = mmToPreviewPx(meta.marginTop, meta);
			const paddingTopPx = mmToPreviewPx(meta.paddingTop, meta);

			const header =
				sheets[0].querySelector<HTMLElement>('.print-header');
			expect(header).not.toBeNull();
			const headerH = header?.getBoundingClientRect().height ?? 0;

			const firstBlockTop = (sheet: HTMLElement) => {
				const first = sheet.querySelector<HTMLElement>(
					'.print-body-slot .content > *'
				);
				if (!first) return Number.NaN;
				const sheetRect = sheet.getBoundingClientRect();
				return first.getBoundingClientRect().top - sheetRect.top;
			};

			// Page 1: margin + surface top padding + layout header, with the
			// first block's own margin preserved (no page break happened).
			const firstPageBlock = sheets[0].querySelector<HTMLElement>(
				'.print-body-slot .content > *'
			);
			const firstMargin = Number.parseFloat(
				doc.defaultView?.getComputedStyle(firstPageBlock as Element)
					.marginTop ?? '0'
			);
			expect(firstMargin).toBeGreaterThan(0);
			expect(
				Math.abs(
					firstBlockTop(sheets[0]) -
						(marginTopPx + paddingTopPx + headerH + firstMargin)
				)
			).toBeLessThan(2);

			for (const sheet of sheets.slice(1)) {
				const first = sheet.querySelector<HTMLElement>(
					'.print-body-slot .content > *'
				);
				expect(first).not.toBeNull();
				// Chromium truncates the top margin at a page break.
				expect(first?.style.marginTop).toBe('0px');
				// Pages after the first start at the page margin: the surface
				// top padding belongs to the first fragment only.
				expect(
					Math.abs(firstBlockTop(sheet) - (marginTopPx + headerH))
				).toBeLessThan(2);
			}
		} finally {
			iframe.remove();
		}
	});

	it('renders the Document Setting header/footer and never the Document Name', async () => {
		const html = buildDocumentMasterPreviewHtml({
			documentHtml: Array.from(
				{ length: 40 },
				(_, i) =>
					`<p>Setting body block ${String(i + 1).padStart(3, '0')} — content used to push the preview onto more than one sheet.</p>`
			).join(''),
			documentTitle: 'Document name must not be a header',
			headerHtml:
				'<div class="setting-letterhead">{{hospital_name}} letterhead</div>',
			footerHtml: '<div class="setting-footer">Setting footer</div>',
			setting: chromeSetting
		});
		const { iframe, sheets } = await mount(html);
		try {
			expect(sheets.length).toBeGreaterThan(1);
			for (const sheet of sheets) {
				expect(sheetText(sheet)).toContain('Sample Hospital letterhead');
				expect(sheetText(sheet)).toContain('Setting footer');
				expect(sheet.querySelector('.document-name')).toBeNull();
			}
			expect(sheetText(sheets[0])).not.toContain(
				'Document name must not be a header'
			);
		} finally {
			iframe.remove();
		}
	});

	it('adds the blank trailing page that print emits for overflow padding', async () => {
		// Same box model as the verified print run (A5 landscape).
		const a5Landscape = {
			pageSize: 'A5',
			pageOrientation: 'landscape',
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
		};
		const { iframe, sheets } = await mount(
			buildChromeHtml(longTableBody(), a5Landscape)
		);
		try {
			expect(sheets.length).toBe(17);
			const lastContent = sheets[16].querySelector(
				'.print-body-slot .content > *'
			);
			expect(lastContent).toBeNull();
			expect(sheetText(sheets[16])).toContain('Hospital footer');
		} finally {
			iframe.remove();
		}
	});
});
