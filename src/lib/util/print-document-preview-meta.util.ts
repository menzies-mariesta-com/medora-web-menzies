import { sanitizeDownloadFileBase } from '$lib/util/print-download-filename.util';

/** Meta from buildPrintDocumentHtml `<html data-*>` — shared by preview, PDF, and print. */
export type PrintDocumentPreviewMeta = {
	captureWidthPx: number;
	pageWidthMm: number;
	pageHeightMm: number;
	orientation: 'portrait' | 'landscape';
	jspdfFormat: string;
	hasChrome: boolean;
	marginTop: number;
	marginBottom: number;
	marginLeft: number;
	marginRight: number;
	paddingTop: number;
	paddingBottom: number;
	paddingLeft: number;
	paddingRight: number;
};

function readAttrNum(
	el: Element | null,
	name: string,
	fallback: number
): number {
	if (!el) return fallback;
	const v = el.getAttribute(name);
	if (!v) return fallback;
	const n = Number.parseFloat(v);
	return Number.isFinite(n) ? n : fallback;
}

function readMetaFromRoot(root: Element): PrintDocumentPreviewMeta {
	const orientation =
		root.getAttribute('data-jspdf-orientation') === 'landscape'
			? 'landscape'
			: 'portrait';
	const jspdfFormat = root.getAttribute('data-jspdf-format') ?? 'a4';
	const captureWidthPx = readAttrNum(root, 'data-capture-width-px', 794);
	let pageWidthMm = readAttrNum(root, 'data-page-width-mm', 0);
	const pageHeightMm = readAttrNum(root, 'data-page-height-mm', 297);
	if (pageWidthMm <= 0) {
		pageWidthMm = (captureWidthPx * 25.4) / 96;
	}

	return {
		captureWidthPx,
		pageWidthMm,
		pageHeightMm,
		orientation,
		jspdfFormat,
		hasChrome: root.getAttribute('data-print-chrome') === '1',
		marginTop: readAttrNum(root, 'data-margin-top-mm', 20),
		marginBottom: readAttrNum(root, 'data-margin-bottom-mm', 20),
		marginLeft: readAttrNum(root, 'data-margin-left-mm', 15),
		marginRight: readAttrNum(root, 'data-margin-right-mm', 15),
		paddingTop: readAttrNum(root, 'data-padding-top-mm', 10),
		paddingBottom: readAttrNum(root, 'data-padding-bottom-mm', 10),
		paddingLeft: readAttrNum(root, 'data-padding-left-mm', 10),
		paddingRight: readAttrNum(root, 'data-padding-right-mm', 10)
	};
}

export function readPrintDocumentPreviewMeta(
	doc: Document
): PrintDocumentPreviewMeta {
	return readMetaFromRoot(doc.documentElement);
}

const DATA_ATTR_RE =
	/data-(?:capture-width-px|page-width-mm|page-height-mm|jspdf-format|jspdf-orientation|print-chrome)="[^"]*"/g;

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Read a root `<html …>` attribute only (ignore duplicate attrs in template body). */
function readHtmlRootAttr(html: string, name: string): string | null {
	const m = html.match(
		new RegExp(
			`<html\\s[^>]*\\b${escapeRegExp(name)}="([^"]*)"`,
			'i'
		)
	);
	return m?.[1] ?? null;
}

function readAttrFromHtml(html: string, name: string): string | null {
	return readHtmlRootAttr(html, name);
}

function readHtmlHeadTitle(html: string): string | null {
	const m = html.match(
		/<head[^>]*>[\s\S]*?<title[^>]*>([^<]*)<\/title>/i
	);
	return m?.[1]?.trim() ?? null;
}

/** Parse shell meta from a full HTML string (no DOM; safe in vitest node). */
export function parsePrintDocumentPreviewMetaFromHtml(
	html: string
): PrintDocumentPreviewMeta | null {
	if (!html.includes('data-capture-width-px')) return null;
	const pseudo = {
		getAttribute(name: string): string | null {
			return readAttrFromHtml(html, name);
		}
	};
	return readMetaFromRoot(pseudo as Element);
}

export function pageHeightPx(meta: PrintDocumentPreviewMeta): number {
	return (meta.pageHeightMm / meta.pageWidthMm) * meta.captureWidthPx;
}

export function mmToPreviewPx(
	mm: number,
	meta: PrintDocumentPreviewMeta
): number {
	return (mm / meta.pageWidthMm) * meta.captureWidthPx;
}

/** Approximate unique string for iframe sizing (layout + page box). */
export function printPreviewLayoutKey(html: string): string {
	const m = html.match(DATA_ATTR_RE);
	return m ? m.join('|') : html.slice(0, 120);
}

function decodeHtmlTextEntities(text: string): string {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

/**
 * PDF download basename from print HTML (`data-download-filename` or `<title>`).
 */
export function resolvePrintDownloadFileBaseFromHtml(
	html: string,
	fallback?: string
): string {
	const fromData = readHtmlRootAttr(html, 'data-download-filename');
	if (fromData?.trim()) {
		return sanitizeDownloadFileBase(decodeHtmlTextEntities(fromData));
	}
	const headTitle = readHtmlHeadTitle(html);
	if (headTitle) {
		return sanitizeDownloadFileBase(decodeHtmlTextEntities(headTitle));
	}
	return sanitizeDownloadFileBase(fallback ?? 'print-preview');
}