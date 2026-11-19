import { flattenLegacyPlaceholderTokens } from '$lib/model/constant/document-placeholder.registry';
import {
	normalizePrintContext,
	resolveDocumentTemplate,
	type DocumentLike,
	type VisitLike
} from '$lib/util/document-placeholder.util';
import type { DocumentTypeIdValue } from '$lib/model/constant/document-type-id.constant';
import { resolveDocumentSettingForDoc } from '$lib/util/emr-print-setting.util';
import {
	buildPrintDocumentHtml,
	preprocessDocumentBodyForLayout
} from '$lib/util/print-document-html.util';
import { buildDocumentMasterDownloadFileBase } from '$lib/util/print-download-filename.util';
import { resolvePrintDownloadFileBaseFromHtml } from '$lib/util/print-document-preview-meta.util';
import { stripScriptTagsForSandboxedPreview } from '$lib/util/print-document-preview-screen.util';
import type {
	ClinicalDocumentRow,
	DocumentMasterPrintBootstrap
} from '$lib/model/type/medora/document-print.type';

export type PrintFromDocumentMasterOptions = {
	hospitalId: string;
	documentTypeId: number;
	documentId?: number;
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

export function resolvePrintDocumentIdForFetch(
	hospitalId: string,
	documentTypeId: number | undefined,
	explicitDocumentId?: number | null
): number | undefined {
	if (explicitDocumentId != null && Number.isFinite(explicitDocumentId)) {
		return explicitDocumentId;
	}
	if (hospitalId && documentTypeId != null) {
		const stored = loadStoredPrintDocumentId(hospitalId, documentTypeId);
		if (stored != null) return stored;
	}
	return undefined;
}

export async function fetchDocumentPrintBootstrap(
	hospitalId: string,
	opts: {
		documentCode?: string;
		documentTypeId?: DocumentTypeIdValue;
		documentId?: number | null;
	}
): Promise<DocumentMasterPrintBootstrap> {
	const resolvedDocumentId = resolvePrintDocumentIdForFetch(
		hospitalId,
		opts.documentTypeId,
		opts.documentId
	);
	const url = new URL(
		`/api/medora/hospital/${hospitalId}/home/document-print`,
		window.location.origin
	);
	url.searchParams.set('mode', 'bootstrap');
	if (opts.documentCode) {
		url.searchParams.set('code', opts.documentCode);
	}
	if (opts.documentTypeId != null) {
		url.searchParams.set('documentTypeId', String(opts.documentTypeId));
	}
	if (resolvedDocumentId != null) {
		url.searchParams.set('documentId', String(resolvedDocumentId));
	}
	const res = await fetch(url.pathname + url.search, {
		credentials: 'include'
	});
	if (!res.ok) {
		throw new Error(`Template load failed (${res.status})`);
	}
	return res.json();
}

export async function fetchPrintOptions(
	hospitalId: string,
	documentTypeId: number
) {
	const res = await fetch(
		`/api/medora/hospital/${hospitalId}/home/document-print?mode=options&documentTypeId=${encodeURIComponent(String(documentTypeId))}`,
		{ credentials: 'include' }
	);
	if (!res.ok) throw new Error(`Print options failed (${res.status})`);
	return res.json() as Promise<{
		options: import('$lib/model/type/medora/document-print.type').DocumentPrintOptionRow[];
		defaultDocumentId: number | null;
	}>;
}

const printTemplateChoiceKey = (hospitalId: string, documentTypeId: number) =>
	`medora.printTemplate.${hospitalId}.type${documentTypeId}`;

export function loadStoredPrintDocumentId(
	hospitalId: string,
	documentTypeId: number
): number | null {
	try {
		const raw = sessionStorage.getItem(
			printTemplateChoiceKey(hospitalId, documentTypeId)
		);
		if (!raw) return null;
		const n = Number(raw);
		return Number.isFinite(n) ? n : null;
	} catch {
		return null;
	}
}

export function storePrintDocumentId(
	hospitalId: string,
	documentTypeId: number,
	documentId: number
) {
	try {
		sessionStorage.setItem(
			printTemplateChoiceKey(hospitalId, documentTypeId),
			String(documentId)
		);
	} catch {
		// ignore
	}
}

export async function printFromDocumentMaster(
	opts: PrintFromDocumentMasterOptions
): Promise<void> {
	const bootstrap = await fetchDocumentPrintBootstrap(opts.hospitalId, {
		documentTypeId: opts.documentTypeId,
		documentId: opts.documentId
	});
	await printFromDocumentMasterBootstrap(bootstrap, opts);
}

export async function printFromDocumentMasterBootstrap(
	bootstrap: DocumentMasterPrintBootstrap,
	opts: Omit<PrintFromDocumentMasterOptions, 'hospitalId' | 'documentTypeId' | 'documentId'>
): Promise<void> {
	const html = buildPrintHtmlFromDocumentMasterBootstrap(
		bootstrap,
		opts,
		'browser'
	);
	await printHtmlInIframe(html, {
		iframeId: opts.iframeId ?? `document-print-${bootstrap.document?.code ?? 'doc'}`,
		onReady: opts.onIframeReady
	});
}

export function buildPrintHtmlFromDocumentMasterBootstrap(
	bootstrap: DocumentMasterPrintBootstrap,
	opts: Omit<PrintFromDocumentMasterOptions, 'hospitalId' | 'documentTypeId' | 'documentId'>,
	variant: 'browser' | 'pdfRaster' = 'browser'
): string {
	const masterDoc = bootstrap.document;
	if (!masterDoc?.documentText) {
		throw new Error('Print template not found');
	}

	const context = normalizePrintContext({
		visit: opts.visit ?? null,
		document: { ...masterDoc, ...opts.document },
		printBy: opts.printBy,
		extraPlaceholders: opts.extraPlaceholders,
		textPlaceholders: bootstrap.textPlaceholders
	});

	const setting = resolveDocumentSettingForDoc(
		bootstrap.documentSetting,
		masterDoc
	);
	const headerHtml = resolveDocumentTemplate(
		flattenLegacyPlaceholderTokens(setting?.headerHtml ?? ''),
		context
	).trim();
	const footerHtml = resolveDocumentTemplate(
		flattenLegacyPlaceholderTokens(setting?.footerHtml ?? ''),
		context
	).trim();
	const showLayoutHeader =
		(setting?.showHeader ?? true) && Boolean(headerHtml.trim());
	let documentHtml = resolveDocumentTemplate(
		flattenLegacyPlaceholderTokens(masterDoc.documentText),
		context
	).trim();
	documentHtml = preprocessDocumentBodyForLayout(documentHtml, {
		layoutHeaderHtml: headerHtml,
		showLayoutHeader
	});
	const documentTitle =
		masterDoc.documentNumber ||
		masterDoc.documentType?.documentType ||
		'Document';

	return buildPrintDocumentHtml({
		documentHtml,
		documentTitle,
		downloadFileBase: buildDocumentMasterDownloadFileBase(
			masterDoc,
			opts.visit ?? null
		),
		headerHtml,
		footerHtml,
		setting,
		variant
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
		iframe.setAttribute('title', 'print');
		// Hidden print target: opt out of Grammarly (it hooks unload and spams policy violations).
		iframe.setAttribute('data-gramm', 'false');
		iframe.setAttribute('data-gramm_editor', 'false');
		iframe.setAttribute('data-enable-grammarly', 'false');
		iframe.setAttribute('spellcheck', 'false');
		iframe.style.cssText =
			'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
		document.body.appendChild(iframe);
	}

	await new Promise<void>((resolve) => {
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			iframe!.removeEventListener('load', finish);
			resolve();
		};
		iframe!.addEventListener('load', finish);
		iframe!.removeAttribute('src');
		iframe!.srcdoc = stripScriptTagsForSandboxedPreview(html);
		window.setTimeout(finish, 300);
	});

	const win = iframe.contentWindow;
	const doc = iframe.contentDocument;
	if (!win || !doc) {
		throw new Error('Failed to prepare print iframe');
	}

	if (opts?.onReady) {
		await opts.onReady(doc, win);
	}

	const printDialogTitle = resolvePrintDownloadFileBaseFromHtml(html);
	doc.title = printDialogTitle;

	window.setTimeout(() => {
		const parentTitle = document.title;
		document.title = printDialogTitle;

		const restoreParentTitle = () => {
			document.title = parentTitle;
		};
		win.addEventListener('afterprint', restoreParentTitle, { once: true });
		window.addEventListener('afterprint', restoreParentTitle, {
			once: true
		});
		window.setTimeout(restoreParentTitle, 120_000);

		try {
			win.focus();
			win.print();
		} catch {
			restoreParentTitle();
		}
	}, 200);
}

export type { ClinicalDocumentRow, DocumentMasterPrintBootstrap };
