import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export type HtmlToPdfOptions = {
	format?: 'a4' | 'a5' | 'letter' | 'legal';
	orientation?: 'portrait' | 'landscape';
	captureWidthPx?: number;
	/** PDF document / suggested download title (not the host page title). */
	documentTitle?: string;
};

type PageInsetsMm = {
	marginTop: number;
	marginBottom: number;
	marginLeft: number;
	marginRight: number;
	paddingTop: number;
	paddingBottom: number;
	paddingLeft: number;
	paddingRight: number;
};

function readAttrMm(root: HTMLElement, name: string, fallback: number): number {
	const v = root.getAttribute(name);
	if (!v) return fallback;
	const n = Number.parseFloat(v);
	return Number.isFinite(n) ? n : fallback;
}

function readPageInsetsMm(doc: Document): PageInsetsMm {
	const root = doc.documentElement;
	return {
		marginTop: readAttrMm(root, 'data-margin-top-mm', 20),
		marginBottom: readAttrMm(root, 'data-margin-bottom-mm', 20),
		marginLeft: readAttrMm(root, 'data-margin-left-mm', 15),
		marginRight: readAttrMm(root, 'data-margin-right-mm', 15),
		paddingTop: readAttrMm(root, 'data-padding-top-mm', 10),
		paddingBottom: readAttrMm(root, 'data-padding-bottom-mm', 10),
		paddingLeft: readAttrMm(root, 'data-padding-left-mm', 10),
		paddingRight: readAttrMm(root, 'data-padding-right-mm', 10)
	};
}

function readPdfOptionsFromHtml(doc: Document): HtmlToPdfOptions {
	const root = doc.documentElement;
	const format = root.getAttribute('data-jspdf-format');
	const orientation = root.getAttribute('data-jspdf-orientation');
	const widthPx = root.getAttribute('data-capture-width-px');
	const fmt =
		format === 'a5' || format === 'letter' || format === 'legal' || format === 'a4'
			? format
			: 'a4';
	const orient = orientation === 'landscape' ? 'landscape' : 'portrait';
	const w = Number(widthPx);
	return {
		format: fmt,
		orientation: orient,
		captureWidthPx: Number.isFinite(w) && w > 0 ? w : 794
	};
}

const CANVAS_SCALE = 2;

function applyPdfDocumentTitle(pdf: jsPDF, title?: string): void {
	const t = title?.trim();
	if (!t) return;
	try {
		pdf.setProperties({ title: t });
	} catch {
		// ignore: older jsPDF builds
	}
}

async function rasterizeElement(
	el: HTMLElement,
	captureWidthPx: number
): Promise<HTMLCanvasElement> {
	const h = Math.max(el.scrollHeight, el.offsetHeight);
	return html2canvas(el, {
		scale: CANVAS_SCALE,
		useCORS: true,
		logging: false,
		width: captureWidthPx,
		height: h,
		windowWidth: captureWidthPx,
		windowHeight: h
	});
}

function canvasHeightMm(canvas: HTMLCanvasElement, pageWidthMm: number): number {
	return (canvas.height * pageWidthMm) / canvas.width;
}

function cropCanvasSlice(
	source: HTMLCanvasElement,
	srcY: number,
	srcHeight: number
): HTMLCanvasElement {
	const slice = document.createElement('canvas');
	slice.width = source.width;
	slice.height = Math.max(1, Math.ceil(srcHeight));
	const ctx = slice.getContext('2d');
	if (!ctx) {
		throw new Error('canvas 2d unavailable');
	}
	ctx.drawImage(
		source,
		0,
		srcY,
		source.width,
		srcHeight,
		0,
		0,
		slice.width,
		slice.height
	);
	return slice;
}

/** Header/footer on every PDF page when print chrome is present. */
async function pdfBlobWithPaginatedChrome(
	doc: Document,
	captureWidthPx: number,
	format: HtmlToPdfOptions['format'],
	orientation: HtmlToPdfOptions['orientation'],
	documentTitle?: string
): Promise<Blob> {
	const header =
		doc.querySelector<HTMLElement>('.print-layout-table thead .print-header') ??
		doc.querySelector<HTMLElement>('.print-header') ??
		null;
	const footer =
		doc.querySelector<HTMLElement>('.print-chrome-bottom') ??
		doc.querySelector<HTMLElement>('.print-footer') ??
		null;
	const content = doc.querySelector<HTMLElement>('.print-surface .content');
	if (!content) {
		throw new Error('print content missing');
	}

	const insets = readPageInsetsMm(doc);
	const pdf = new jsPDF({
		orientation,
		unit: 'mm',
		format: format ?? 'a4'
	});
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const contentWidth = Math.max(
		1,
		pageWidth -
			insets.marginLeft -
			insets.marginRight -
			insets.paddingLeft -
			insets.paddingRight
	);
	const contentWidthPx = Math.max(
		1,
		Math.round(captureWidthPx * (contentWidth / pageWidth))
	);
	const insetX = insets.marginLeft + insets.paddingLeft;
	const yHead = insets.marginTop + insets.paddingTop;

	const [headerCanvas, contentCanvas, footerCanvas] = await Promise.all([
		header ? rasterizeElement(header, contentWidthPx) : Promise.resolve(null),
		rasterizeElement(content, contentWidthPx),
		footer ? rasterizeElement(footer, contentWidthPx) : Promise.resolve(null)
	]);

	const headerMm = headerCanvas ? canvasHeightMm(headerCanvas, contentWidth) : 0;
	const footerMm = footerCanvas ? canvasHeightMm(footerCanvas, contentWidth) : 0;
	const verticalChrome =
		insets.marginTop +
		insets.paddingTop +
		headerMm +
		insets.paddingBottom +
		insets.marginBottom +
		footerMm;
	const bodySlotMm = Math.max(8, pageHeight - verticalChrome);
	const contentTotalMm = canvasHeightMm(contentCanvas, contentWidth);
	const yBody = yHead + headerMm;
	const yFooter = pageHeight - insets.marginBottom - insets.paddingBottom - footerMm;

	const headerData = headerCanvas?.toDataURL('image/png');
	const footerData = footerCanvas?.toDataURL('image/png');

	let offsetMm = 0;
	let first = true;
	while (offsetMm < contentTotalMm - 0.05) {
		if (!first) {
			pdf.addPage();
		}
		first = false;

		if (headerData && headerCanvas) {
			pdf.addImage(headerData, 'PNG', insetX, yHead, contentWidth, headerMm);
		}

		const sliceMm = Math.min(bodySlotMm, contentTotalMm - offsetMm);
		const srcY = (offsetMm * contentCanvas.width) / contentWidth;
		const srcH = (sliceMm * contentCanvas.width) / contentWidth;
		const slice = cropCanvasSlice(contentCanvas, srcY, srcH);
		pdf.addImage(
			slice.toDataURL('image/png'),
			'PNG',
			insetX,
			yBody,
			contentWidth,
			sliceMm
		);

		if (footerData && footerCanvas) {
			pdf.addImage(footerData, 'PNG', insetX, yFooter, contentWidth, footerMm);
		}

		offsetMm += sliceMm;
	}

	applyPdfDocumentTitle(pdf, documentTitle);
	return pdf.output('blob');
}

async function pdfBlobFromFullRaster(
	surface: HTMLElement,
	captureWidthPx: number,
	format: HtmlToPdfOptions['format'],
	orientation: HtmlToPdfOptions['orientation'],
	documentTitle?: string
): Promise<Blob> {
	const scrollHeight = Math.max(surface.scrollHeight, surface.offsetHeight);
	const canvas = await html2canvas(surface, {
		scale: CANVAS_SCALE,
		useCORS: true,
		logging: false,
		width: captureWidthPx,
		height: scrollHeight,
		windowWidth: captureWidthPx,
		windowHeight: scrollHeight
	});

	const imgData = canvas.toDataURL('image/png');
	const pdf = new jsPDF({
		orientation,
		unit: 'mm',
		format: format ?? 'a4'
	});
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const imgWidth = pageWidth;
	const imgHeight = (canvas.height * pageWidth) / canvas.width;

	let heightLeft = imgHeight;
	let position = 0;

	pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
	heightLeft -= pageHeight;

	while (heightLeft > 0) {
		position = heightLeft - imgHeight;
		pdf.addPage();
		pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
		heightLeft -= pageHeight;
	}

	applyPdfDocumentTitle(pdf, documentTitle);
	return pdf.output('blob');
}

/**
 * Rasterizes HTML (full document string) to a multi-page PDF in the browser.
 * Page size/orientation come from `data-*` on `<html>` (see buildPrintDocumentHtml).
 */
export async function htmlStringToPdfBlob(
	html: string,
	opts?: HtmlToPdfOptions
): Promise<Blob> {
	const iframe = document.createElement('iframe');
	iframe.setAttribute('title', 'pdf-render');
	iframe.style.cssText =
		'position:fixed;left:-12000px;top:0;border:0;visibility:hidden;';
	document.body.appendChild(iframe);

	try {
		const win = iframe.contentWindow;
		const doc = iframe.contentDocument;
		if (!win || !doc) {
			throw new Error('iframe document unavailable');
		}
		doc.open();
		doc.write(html);
		doc.close();

		const fromHtml = readPdfOptionsFromHtml(doc);
		const format = opts?.format ?? fromHtml.format ?? 'a4';
		const orientation = opts?.orientation ?? fromHtml.orientation ?? 'portrait';
		const captureWidthPx =
			opts?.captureWidthPx ?? fromHtml.captureWidthPx ?? 794;
		const documentTitle =
			opts?.documentTitle?.trim() ||
			doc.documentElement.getAttribute('data-download-filename')?.trim() ||
			doc.title?.trim() ||
			undefined;

		iframe.style.width = `${captureWidthPx}px`;
		iframe.style.minHeight = '400px';

		await new Promise<void>((resolve) => {
			win.requestAnimationFrame(() => {
				setTimeout(() => resolve(), 300);
			});
		});

		const hasPrintChrome =
			doc.documentElement.getAttribute('data-print-chrome') === '1' ||
			Boolean(
				doc.querySelector('.print-chrome-bottom') ||
					doc.querySelector('.print-layout-table')
			);
		if (hasPrintChrome) {
			return pdfBlobWithPaginatedChrome(
				doc,
				captureWidthPx,
				format,
				orientation,
				documentTitle
			);
		}

		const surface =
			doc.querySelector<HTMLElement>('.print-page') ??
			doc.querySelector<HTMLElement>('.print-surface') ??
			doc.body;
		return pdfBlobFromFullRaster(
			surface,
			captureWidthPx,
			format,
			orientation,
			documentTitle
		);
	} finally {
		iframe.remove();
	}
}

export async function uploadPatientAttachmentPdf(
	file: Blob,
	filename: string
): Promise<string> {
	const formData = new FormData();
	formData.append(
		'file',
		new File([file], filename, { type: 'application/pdf' })
	);
	const res = await fetch('/api/upload/patient-attachment', {
		method: 'POST',
		body: formData
	});
	const data = (await res.json()) as { url?: string; error?: string };
	if (!res.ok) {
		throw new Error(data.error ?? 'Upload failed');
	}
	if (!data.url) {
		throw new Error('Upload returned no URL');
	}
	return data.url;
}