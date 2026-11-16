<script lang="ts">
	import type { Snippet } from 'svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import LucideDownload from '$lib/component/own/library/lucide/LucideDownload.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import {
		pageHeightPx,
		parsePrintDocumentPreviewMetaFromHtml,
		printPreviewLayoutKey,
		type PrintDocumentPreviewMeta
	} from '$lib/util/print-document-preview-meta.util';
	import {
		mountPrintPreviewInIframe,
		type PrintPreviewMountResult
	} from '$lib/util/print-document-preview-screen.util';
	import { printHtmlInIframe } from '$lib/util/document-master-print.util.svelte';
	import PrintDocumentTemplatePicker from '$lib/component/own/library/menzies/PrintDocumentTemplatePicker.svelte';

	let {
		html = '',
		title = 'Print preview',
		className = '',
		fitToContainer = true,
		minHeight = 'min-h-[320px]',
		emptyMessage = 'No preview',
		showToolbar = true,
		showMeta = true,
		showPrintButton = true,
		showDownloadButton = true,
		printLabel = 'Print',
		downloadLabel = 'Download PDF',
		downloadFileName,
		actions,
		documentTemplateHospitalId = undefined,
		documentTemplateTypeId = undefined,
		selectedDocumentTemplateId = $bindable<number | null>(null)
	}: {
		/** Complete print-document HTML (usually from buildPrintDocumentHtml). */
		html?: string;
		title?: string;
		className?: string;
		fitToContainer?: boolean;
		minHeight?: string;
		emptyMessage?: string;
		showToolbar?: boolean;
		showMeta?: boolean;
		showPrintButton?: boolean;
		showDownloadButton?: boolean;
		printLabel?: string;
		downloadLabel?: string;
		/** Base filename for PDF download (without extension). */
		downloadFileName?: string;
		/** Extra toolbar actions rendered before the built-in buttons. */
		actions?: Snippet;
		/** When set with `documentTemplateTypeId`, shows multi-template picker above preview. */
		documentTemplateHospitalId?: string;
		documentTemplateTypeId?: number;
		selectedDocumentTemplateId?: number | null;
	} = $props();

	const showDocumentTemplatePicker = $derived(
		Boolean(
			documentTemplateHospitalId?.trim() &&
				documentTemplateTypeId != null &&
				Number.isFinite(documentTemplateTypeId)
		)
	);
	const docTemplateBar = $derived(
		showDocumentTemplatePicker &&
			Boolean(documentTemplateHospitalId) &&
			documentTemplateTypeId != null
	);

	let hostEl = $state<HTMLDivElement | null>(null);
	let iframeEl = $state<HTMLIFrameElement | null>(null);
	let preview = $state<PrintPreviewMountResult | null>(null);
	let scale = $state(1);
	let isLoading = $state(false);
	let isPrinting = $state(false);
	let isDownloading = $state(false);

	const meta = $derived<PrintDocumentPreviewMeta | null>(
		html ? parsePrintDocumentPreviewMetaFromHtml(html) : null
	);
	const hasContent = $derived(Boolean(html.trim()));
	const sourceWidth = $derived(
		preview?.width ?? meta?.captureWidthPx ?? 794
	);
	const pageCount = $derived(preview?.pageCount ?? 1);

	const layoutWidth = $derived(sourceWidth * scale);
	const layoutHeight = $derived.by(() => {
		if (preview) return preview.height * scale;
		return (meta ? pageHeightPx(meta) + 8 : 600) * scale;
	});

	const showToolbarChrome = $derived(
		showToolbar && (hasContent || docTemplateBar)
	);
	const metaOnSeparateRow = $derived(showMeta && hasContent && docTemplateBar);

	function roundMm(value: number): string {
		return Number.isInteger(value) ? String(value) : value.toFixed(1);
	}

	const sizeLabel = $derived(
		meta
			? `${roundMm(meta.pageWidthMm)} × ${roundMm(meta.pageHeightMm)} mm`
			: null
	);
	const orientationLabel = $derived(
		meta
			? meta.orientation === 'landscape'
				? 'Landscape'
				: 'Portrait'
			: null
	);
	const formatLabel = $derived(
		meta ? meta.jspdfFormat.toUpperCase() : null
	);
	const marginLabel = $derived(
		meta
			? `${roundMm(meta.marginTop)}/${roundMm(meta.marginRight)}/${roundMm(meta.marginBottom)}/${roundMm(meta.marginLeft)} mm`
			: null
	);
	const paddingLabel = $derived(
		meta
			? `${roundMm(meta.paddingTop)}/${roundMm(meta.paddingRight)}/${roundMm(meta.paddingBottom)}/${roundMm(meta.paddingLeft)} mm`
			: null
	);
	const pageLabel = $derived(
		`${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`
	);

	function updateScale() {
		if (!fitToContainer || !hostEl) {
			scale = 1;
			return;
		}
		const hostW = hostEl.clientWidth - 16;
		if (hostW <= 0) {
			scale = 1;
			return;
		}
		scale = Math.min(1, hostW / sourceWidth);
	}

	$effect(() => {
		const host = hostEl;
		if (!host || !fitToContainer) return;
		const ro = new ResizeObserver(() => updateScale());
		ro.observe(host);
		return () => ro.disconnect();
	});

	$effect(() => {
		void sourceWidth;
		updateScale();
	});

	$effect(() => {
		const iframe = iframeEl;
		const content = html;
		const layoutKey = printPreviewLayoutKey(content);
		if (!iframe || !content.trim()) {
			preview = null;
			isLoading = false;
			return;
		}
		let active = true;
		isLoading = true;
		void mountPrintPreviewInIframe(iframe, content).then((result) => {
			if (!active || printPreviewLayoutKey(html) !== layoutKey)
				return;
			preview = result;
			isLoading = false;
			updateScale();
		});
		return () => {
			active = false;
		};
	});

	/** Print the exact same HTML the preview is showing. */
	export async function print(): Promise<void> {
		if (!hasContent || isPrinting) return;
		isPrinting = true;
		try {
			await printHtmlInIframe(html, {
				iframeId: 'global-print-preview-print-iframe'
			});
		} finally {
			isPrinting = false;
		}
	}

	/** Download the exact same HTML the preview is showing, using its jspdf page spec. */
	export async function downloadPdf(): Promise<void> {
		if (!hasContent || isDownloading) return;
		isDownloading = true;
		try {
			const { htmlStringToPdfBlob } =
				await import('$lib/util/html-to-pdf.util');
			const blob = await htmlStringToPdfBlob(html);
			const base = (downloadFileName || title || 'print-preview')
				.replace(/[^\w.-]+/g, '_')
				.slice(0, 120);
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${base}.pdf`;
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			isDownloading = false;
		}
	}
</script>

{#snippet layoutMetaBadges()}
	{#if sizeLabel}
		<span
			class="badge badge-outline badge-sm"
			title="Page width × height"
		>
			{sizeLabel}
		</span>
	{/if}
	{#if orientationLabel}
		<span class="badge badge-outline badge-sm">
			{orientationLabel}
		</span>
	{/if}
	{#if formatLabel}
		<span class="badge badge-outline badge-sm" title="jsPDF format">
			{formatLabel}
		</span>
	{/if}
	<span class="badge badge-outline badge-sm">{pageLabel}</span>
	{#if marginLabel}
		<span
			class="badge badge-ghost badge-sm"
			title="Margin top/right/bottom/left"
		>
			Margin {marginLabel}
		</span>
	{/if}
	{#if paddingLabel}
		<span
			class="badge badge-ghost badge-sm"
			title="Padding top/right/bottom/left"
		>
			Padding {paddingLabel}
		</span>
	{/if}
{/snippet}

{#snippet toolbarActions()}
	{#if actions}
		{@render actions()}
	{/if}
	{#if showDownloadButton}
		<WashButton
			className="btn-outline btn-sm gap-1.5"
			onClick={() => void downloadPdf()}
			loading={isDownloading}
			loadingText="Preparing…"
			disabled={!hasContent}
		>
			<LucideDownload className="size-4" />
			{downloadLabel}
		</WashButton>
	{/if}
	{#if showPrintButton}
		<WashButton
			className="btn-primary btn-sm gap-1.5"
			onClick={() => void print()}
			loading={isPrinting}
			loadingText="Printing…"
			disabled={!hasContent}
		>
			<LucidePrinter className="size-4" />
			{printLabel}
		</WashButton>
	{/if}
{/snippet}

<div class={['flex flex-col gap-2', className].filter(Boolean).join(' ')}>
	{#if showToolbarChrome}
		<div
			class="no-print rounded-box border border-base-300 bg-base-200/40 p-3"
		>
			<div
				class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2"
			>
				<div class="min-w-0 flex-1">
					{#if docTemplateBar}
						<PrintDocumentTemplatePicker
							hospitalId={documentTemplateHospitalId}
							documentTypeId={documentTemplateTypeId}
							bind:selectedDocumentId={selectedDocumentTemplateId}
						/>
					{:else if showMeta && hasContent}
						<div class="flex flex-wrap items-center gap-1">
							{@render layoutMetaBadges()}
						</div>
					{/if}
				</div>
				<div class="flex shrink-0 flex-wrap items-center gap-1.5">
					{@render toolbarActions()}
				</div>
			</div>
			{#if metaOnSeparateRow}
				<div
					class="mt-2 flex flex-wrap items-center gap-1 border-t border-base-300 pt-2"
				>
					{@render layoutMetaBadges()}
				</div>
			{/if}
		</div>
	{/if}

	<div
		class="relative overflow-x-auto overflow-y-auto rounded-box border border-base-300 bg-base-200/20 p-2 {minHeight}"
		bind:this={hostEl}
	>
		{#if !hasContent}
			<div
				class="flex h-full min-h-[inherit] items-center justify-center px-4 text-sm text-base-content/60"
				role="status"
			>
				{emptyMessage}
			</div>
		{:else}
			{#if isLoading}
				<div
					class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-box bg-base-100/60"
					role="status"
				>
					<span class="loading loading-spinner loading-md"></span>
				</div>
			{/if}
			<div
				class="mx-auto"
				style:width={`${layoutWidth}px`}
				style:height={`${layoutHeight}px`}
			>
				<iframe
					bind:this={iframeEl}
					{title}
					class="block border-0 bg-transparent"
					sandbox="allow-same-origin"
					scrolling="no"
					style:transform={scale < 1 ? `scale(${scale})` : undefined}
					style:transform-origin="top left"
				></iframe>
			</div>
		{/if}
	</div>
</div>