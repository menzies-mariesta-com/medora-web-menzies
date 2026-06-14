import {
	buildDocumentPlaceholderContext,
	resolveDocumentTemplate,
	type DocumentLike,
	type VisitLike
} from '$lib/util/document-placeholder.util';
import { resolveDocumentSettingForDoc } from '$lib/util/emr-print-setting.util';
import { buildPrintDocumentHtml } from '$lib/util/print-document-html.util';
import type {
	ClinicalDocumentRow,
	DocumentMasterPrintBootstrap
} from '$lib/model/type/heka/document-print.type';

export type PrintFromDocumentMasterOptions = {
	hospitalId: string;
	documentCode: string;
	visit?: VisitLike | null;
	document?: DocumentLike | null;
	printBy?: string;
	extraPlaceholders?: Record<string, string>;
	iframeId?: string;
	onIframeReady?: (
		doc: Document,
		win: Window
	) => void | Promise<void>;
};

export async function fetchDocumentPrintBootstrap(
	hospitalId: string,
	documentCode: string
): Promise<DocumentMasterPrintBootstrap> {
	const res = await fetch(
		`/api/heka/hospital/${hospitalId}/home/document-print?mode=bootstrap&code=${encodeURIComponent(documentCode)}`,
		{ credentials: 'include' }
	);
	if (!res.ok) {
		throw new Error(`Template load failed (${res.status})`);
	}
	return res.json();
}

export async function printFromDocumentMaster(
	opts: PrintFromDocumentMasterOptions
): Promise<void> {
	const bootstrap = await fetchDocumentPrintBootstrap(
		opts.hospitalId,
		opts.documentCode
	);
	await printFromDocumentMasterBootstrap(bootstrap, opts);
}

export async function printFromDocumentMasterBootstrap(
	bootstrap: DocumentMasterPrintBootstrap,
	opts: Omit<PrintFromDocumentMasterOptions, 'hospitalId' | 'documentCode'>
): Promise<void> {
	const masterDoc = bootstrap.document;
	if (!masterDoc?.documentText) {
		throw new Error('Print template not found');
	}

	const context = buildDocumentPlaceholderContext(
		opts.visit ?? null,
		{ ...masterDoc, ...opts.document },
		{
			printBy: opts.printBy,
			extraPlaceholders: opts.extraPlaceholders
		}
	);

	const setting = resolveDocumentSettingForDoc(
		bootstrap.documentSettings,
		masterDoc
	);
	const documentHtml = resolveDocumentTemplate(
		masterDoc.documentText,
		context
	).trim();
	const headerHtml = resolveDocumentTemplate(
		setting?.headerHtml,
		context
	).trim();
	const footerHtml = resolveDocumentTemplate(
		setting?.footerHtml,
		context
	).trim();
	const documentTitle =
		masterDoc.documentNumber ||
		masterDoc.documentType?.documentType ||
		'Document';

	const html = buildPrintDocumentHtml({
		documentHtml,
		documentTitle,
		headerHtml,
		footerHtml,
		setting,
		variant: 'browser'
	});

	await printHtmlInIframe(html, {
		iframeId: opts.iframeId ?? `document-print-${masterDoc.code ?? 'doc'}`,
		onReady: opts.onIframeReady
	});
}

export async function printHtmlInIframe(
	html: string,
	opts?: {
		iframeId?: string;
		onReady?: (doc: Document, win: Window) => void | Promise<void>;
	}
): Promise<void> {
	const iframeId = opts?.iframeId ?? 'document-print-iframe';
	let iframe = document.getElementById(
		iframeId
	) as HTMLIFrameElement | null;

	if (!iframe) {
		iframe = document.createElement('iframe');
		iframe.id = iframeId;
		iframe.style.cssText =
			'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
		document.body.appendChild(iframe);
	}

	const win = iframe.contentWindow;
	const doc = win?.document;
	if (!win || !doc) {
		throw new Error('Failed to prepare print iframe');
	}

	doc.open();
	doc.write(html);
	doc.close();

	if (opts?.onReady) {
		await opts.onReady(doc, win);
	}

	window.setTimeout(() => {
		try {
			win.focus();
			win.print();
		} catch {
			// ignore
		}
	}, 200);
}

export type { ClinicalDocumentRow, DocumentMasterPrintBootstrap };
