import { mmToCssPx } from '$lib/util/print-document-html.util';
import {
	mmToPreviewPx,
	pageHeightPx,
	parsePrintDocumentPreviewMetaFromHtml,
	type PrintDocumentPreviewMeta,
	readPrintDocumentPreviewMeta
} from '$lib/util/print-document-preview-meta.util';

const PREVIEW_ATTR = 'data-print-preview';

export type PrintPreviewScreenResult = {
	meta: PrintDocumentPreviewMeta | null;
	pageCount: number;
};

export type PrintPreviewMountResult = PrintPreviewScreenResult & {
	height: number;
	width: number;
};

function countPreviewPages(doc: Document): number {
	const sheets = doc.querySelectorAll('.print-preview-sheet');
	return Math.max(1, sheets.length);
}

/** Paginated on-screen sheets using the same box model as @media print (rules in buildPrintDocumentHtml). */
export function enhancePrintDocumentForScreenPreview(
	doc: Document
): PrintPreviewScreenResult {
	const root = doc.documentElement;
	if (root.getAttribute(PREVIEW_ATTR) === '1') {
		return {
			meta: readPrintDocumentPreviewMeta(doc),
			pageCount: countPreviewPages(doc)
		};
	}
	root.setAttribute(PREVIEW_ATTR, '1');
	const meta = readPrintDocumentPreviewMeta(doc);
	paginatePrintPreview(doc, meta);
	return { meta, pageCount: countPreviewPages(doc) };
}

/** Print shell footer reserve (`.print-layout-footer-cell` height). */
const FOOTER_RESERVE_MM = 30;

/**
 * Usable body band per sheet, in preview px, mirroring Chromium's paged
 * layout of the print shell (verified against Chromium print-to-PDF):
 *
 * - `@page` margins become the sheet padding.
 * - `.print-surface` vertical padding only applies to the first fragment
 *   (padding-top) and the last fragment (padding-bottom).
 * - a repeated `thead` (layout header) occupies the top of every page.
 * - a repeated `tfoot` reserves {@link FOOTER_RESERVE_MM}mm at the bottom of
 *   every page when a footer is rendered.
 *
 * Page 1 body starts after `marginTop + paddingTop + headerHeight`; later
 * pages after `marginTop + headerHeight`; content never crosses
 * `pageHeight - marginBottom - footerReserve`.
 */
function bodyBandPx(
	meta: PrintDocumentPreviewMeta,
	headerEl: Element | null,
	hasFooter: boolean,
	firstPage: boolean
): number {
	const printableH =
		pageHeightPx(meta) -
		mmToPreviewPx(meta.marginTop + meta.marginBottom, meta);
	const headerH = headerEl
		? headerEl.getBoundingClientRect().height
		: 0;
	const footerH = hasFooter
		? mmToPreviewPx(FOOTER_RESERVE_MM, meta)
		: 0;
	const padTop = firstPage ? mmToPreviewPx(meta.paddingTop, meta) : 0;
	return Math.max(48, printableH - headerH - footerH - padTop);
}

type FlowBox = { top: number; bottom: number };

function tableBodyRows(
	table: HTMLTableElement
): HTMLTableRowElement[] {
	return Array.from(table.tBodies).flatMap((tbody) =>
		Array.from(tbody.rows)
	);
}

/** Clone a table keeping only body rows `[start, end)`, repeating thead. */
function cloneTableRows(
	table: HTMLTableElement,
	start: number,
	end: number,
	rowCount: number
): Node {
	const clone = table.cloneNode(true) as HTMLTableElement;
	const rows = tableBodyRows(clone);
	rows.forEach((row, index) => {
		if (index < start || index >= end) row.remove();
	});
	const isContinuation = start > 0;
	const isFinalFragment = end >= rowCount;
	if (isContinuation || !isFinalFragment) {
		clone.querySelectorAll('caption').forEach((el) => el.remove());
	}
	if (!isFinalFragment) {
		clone.querySelectorAll('tfoot').forEach((el) => el.remove());
	}
	return clone;
}

/** Chromium drops the top margin of the first block after a page break. */
function truncateLeadingMargins(el: Element): void {
	el.style.marginTop = '0px';
	const tableTags = new Set([
		'TABLE',
		'THEAD',
		'TBODY',
		'TFOOT',
		'TR',
		'TD',
		'TH',
		'CAPTION'
	]);
	let current = el;
	while (current.firstElementChild) {
		const style = getComputedStyle(current);
		const padTop = Number.parseFloat(style.paddingTop) || 0;
		const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
		if (padTop > 0 || borderTop > 0) return;
		const next = current.firstElementChild as HTMLElement;
		if (tableTags.has(next.tagName)) return;
		next.style.marginTop = '0px';
		current = next;
	}
}

function paginatePrintPreview(
	doc: Document,
	meta: PrintDocumentPreviewMeta
): void {
	const printPage = doc.querySelector('.print-page');
	if (
		!printPage?.parentElement ||
		doc.querySelector('.print-preview-stack')
	) {
		return;
	}

	const surface = printPage.querySelector('.print-surface');
	if (!surface) return;

	const contentEl =
		surface.querySelector<HTMLElement>('.print-body-slot .content') ??
		surface.querySelector<HTMLElement>('.content');
	if (!contentEl) return;

	const headerEl =
		surface.querySelector<HTMLElement>(
			'.print-layout-table thead .print-header'
		) ?? surface.querySelector<HTMLElement>('.print-header');
	const footerEl = surface.querySelector<HTMLElement>(
		'.print-chrome-bottom'
	);

	const contentTop = contentEl.getBoundingClientRect().top;
	const flowBox = (el: Element): FlowBox => {
		const rect = el.getBoundingClientRect();
		return {
			top: rect.top - contentTop,
			bottom: rect.bottom - contentTop
		};
	};

	const bandFirst = bodyBandPx(
		meta,
		headerEl,
		footerEl !== null,
		true
	);
	const bandOther = bodyBandPx(
		meta,
		headerEl,
		footerEl !== null,
		false
	);
	const bandFor = (pageIndex: number) =>
		pageIndex === 0 ? bandFirst : bandOther;

	const children = Array.from(contentEl.children) as Element[];
	const pages: Array<Array<() => Node>> = [[]];
	// Vertical offset of the first piece on a page (non-zero only when the
	// page continues Chromium's already-overflowing flow).
	const pageOffsets: number[] = [0];
	let pageIndex = 0;
	// Flow offset (from the content top) where the current page starts.
	let pageStart = 0;
	// Height used on the current page, in sheet px.
	let pageUsed = 0;
	let hasContent = false;
	// Current page starts where a previous page overflowed, so following
	// content keeps its flow position instead of moving to the page top.
	let strided = false;
	let overflowed = false;

	const newPage = (nextTop: number) => {
		pageIndex += 1;
		pages.push([]);
		pageOffsets[pageIndex] = 0;
		pageStart = nextTop;
		pageUsed = 0;
		hasContent = false;
		strided = false;
		overflowed = false;
	};

	/** Advance one page in flow order (Chromium does not reflow overflow). */
	const stridePage = () => {
		const band = bandFor(pageIndex);
		newPage(pageStart + band);
		strided = true;
		overflowed = false;
	};

	const placeWhole = (node: Element, box: FlowBox) => {
		const height = box.bottom - box.top;
		while (
			hasContent &&
			box.bottom - pageStart > bandFor(pageIndex)
		) {
			if (height > bandFor(pageIndex)) {
				// No page can hold this block: Chromium anchors it at its
				// flow position and clips the overflow.
				overflowed = true;
				break;
			}
			if (strided || overflowed) {
				stridePage();
				continue;
			}
			// A block that does not fit moves whole to the next page
			// (Chromium truncates its top margin at the page break).
			newPage(box.top);
		}
		if (!hasContent) {
			if (strided) {
				pageOffsets[pageIndex] = Math.max(0, box.top - pageStart);
			} else {
				pageStart = box.top;
			}
			strided = false;
			hasContent = true;
		}
		pageUsed = box.bottom - pageStart;
		pages[pageIndex].push(() => node.cloneNode(true));
	};

	const placeTable = (table: HTMLTableElement, box: FlowBox) => {
		const bodyRows = tableBodyRows(table);
		if (bodyRows.length === 0) {
			placeWhole(table, box);
			return;
		}
		const rowBoxes = bodyRows.map(flowBox);
		const theadH = table.tHead
			? table.tHead.getBoundingClientRect().height
			: 0;

		let rowIndex = 0;
		let firstFragment = true;
		while (rowIndex < bodyRows.length) {
			const band = bandFor(pageIndex);
			// Space already consumed above the table on this page.
			const beforeTable =
				hasContent && firstFragment ? box.top - pageStart : 0;
			const rowsRoom = band - beforeTable - theadH;
			const startRow = rowIndex;
			let used = 0;
			while (rowIndex < bodyRows.length) {
				const h = rowBoxes[rowIndex].bottom - rowBoxes[rowIndex].top;
				if (rowIndex > startRow && used + h > rowsRoom) break;
				used += h;
				rowIndex += 1;
			}
			if (rowIndex === startRow) {
				if (hasContent) {
					// Nothing fits under the content already on this page.
					newPage(0);
					firstFragment = false;
					continue;
				}
				// A single row taller than a page: force it through.
				rowIndex += 1;
			}

			if (!hasContent) {
				// On a continuation page the repeated `thead` is rendered above
				// the rows, so flow offsets must be shifted by its height to map
				// onto the sheet.
				pageStart =
					startRow === 0 ? box.top : rowBoxes[startRow].top - theadH;
				hasContent = true;
				pageUsed = theadH + used;
			} else {
				pageUsed = beforeTable + theadH + used;
			}

			const start = startRow;
			const end = rowIndex;
			pages[pageIndex].push(() =>
				cloneTableRows(table, start, end, bodyRows.length)
			);
			firstFragment = false;

			if (rowIndex < bodyRows.length) {
				newPage(0);
				firstFragment = false;
			}
		}
	};

	for (const child of children) {
		const box = flowBox(child);
		if (child.tagName === 'TABLE') {
			placeTable(child as HTMLTableElement, box);
		} else {
			placeWhole(child, box);
		}
	}

	// Chromium also fragments the trailing padding of the last page. When the
	// last page content plus that padding does not fit, print emits one extra
	// (body-empty) page: mirror it so page counts stay identical.
	const lastBand = bandFor(pageIndex);
	const footerReservePx = footerEl
		? mmToPreviewPx(FOOTER_RESERVE_MM, meta)
		: 0;
	const padPx = mmToPreviewPx(meta.paddingBottom, meta);
	const bodyPadTrailing =
		headerEl || footerEl ? padPx + footerReservePx : 0;
	const trailingPx = bodyPadTrailing + padPx;
	if (
		pages[pageIndex].length > 0 &&
		pageUsed + trailingPx > lastBand
	) {
		pages.push([]);
	}

	const stack = doc.createElement('div');
	stack.className = 'print-preview-stack';

	pages.forEach((slice, index) => {
		const sheet = doc.createElement('div');
		sheet.className = 'print-preview-sheet';
		sheet.setAttribute('data-print-preview-page', String(index + 1));
		if (index === 0) sheet.setAttribute('data-preview-first', '1');
		if (index === pages.length - 1) {
			sheet.setAttribute('data-preview-last', '1');
		}

		const pageClone = printPage.cloneNode(true) as HTMLElement;
		const contentTarget =
			pageClone.querySelector<HTMLElement>(
				'.print-body-slot .content'
			) ?? pageClone.querySelector<HTMLElement>('.content');
		if (contentTarget) {
			contentTarget.innerHTML = '';
			for (const make of slice) {
				contentTarget.appendChild(make());
			}
			const firstChild = contentTarget.firstElementChild;
			if (index > 0 && firstChild) {
				truncateLeadingMargins(firstChild);
			}
			const offset = pageOffsets[index] ?? 0;
			if (offset > 0.5 && firstChild) {
				const gap = doc.createElement('div');
				gap.className = 'print-preview-gap';
				gap.style.height = `${offset}px`;
				contentTarget.insertBefore(gap, firstChild);
			}
		}
		sheet.appendChild(pageClone);
		stack.appendChild(sheet);
	});

	printPage.replaceWith(stack);
}

/**
 * Load a full print document into an iframe and render the exact print pages.
 *
 * The iframe width MUST be set to the captured page width before `srcdoc`
 * is assigned. Otherwise the document lays out at the browser default
 * (~300px) and pagination is measured against the wrong content width.
 */
export async function mountPrintPreviewInIframe(
	iframe: HTMLIFrameElement,
	html: string
): Promise<PrintPreviewMountResult> {
	const metaFromHtml = parsePrintDocumentPreviewMetaFromHtml(html);
	const captureW = metaFromHtml?.captureWidthPx ?? mmToCssPx(210);
	const baseHeight = metaFromHtml
		? pageHeightPx(metaFromHtml)
		: mmToCssPx(297);

	iframe.style.width = `${captureW}px`;
	iframe.style.height = `${baseHeight}px`;
	iframe.style.border = '0';
	iframe.style.display = 'block';
	iframe.style.background = 'transparent';
	iframe.style.overflow = 'hidden';
	iframe.setAttribute('scrolling', 'no');

	await new Promise<void>((resolve) => {
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			iframe.removeEventListener('load', finish);
			resolve();
		};
		iframe.addEventListener('load', finish);
		iframe.removeAttribute('src');
		iframe.srcdoc = html;
		window.setTimeout(finish, 450);
	});

	const doc = iframe.contentDocument;
	if (!doc?.documentElement) {
		return {
			meta: metaFromHtml,
			pageCount: 1,
			height: baseHeight,
			width: captureW
		};
	}

	if (doc.fonts) {
		await doc.fonts.ready.catch(() => undefined);
	}

	const enhanced = enhancePrintDocumentForScreenPreview(doc);
	const meta = enhanced.meta ?? metaFromHtml;
	const width = meta?.captureWidthPx ?? captureW;

	// Ensure the iframe has final width before measuring page height.
	iframe.style.width = `${width}px`;

	await new Promise<void>((resolve) => {
		doc.defaultView?.requestAnimationFrame(() => {
			doc.defaultView?.requestAnimationFrame(() => resolve());
		});
	});

	const height = Math.max(
		1,
		Math.ceil(doc.documentElement.scrollHeight)
	);
	iframe.style.height = `${height}px`;

	return {
		meta,
		pageCount: enhanced.pageCount,
		height,
		width
	};
}
