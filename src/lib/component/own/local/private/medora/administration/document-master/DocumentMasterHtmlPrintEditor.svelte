<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { DOCUMENT_TEMPLATE_PLACEHOLDERS } from '$lib/util/document-placeholder.util';
	import { buildDocumentMasterPreviewHtml } from '$lib/util/document-master-preview.util.svelte';
	import {
		appendPlaceholderToHtml,
		formatHtmlForEditor
	} from '$lib/util/format-html.util';
	import type { PrintDocumentLayoutInput } from '$lib/util/print-document-html.util';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { m } from '$lib/paraglide/messages';

	let {
		html = $bindable(''),
		documentTitle = 'Document',
		setting = null as PrintDocumentLayoutInput | null,
		headerHtml = '',
		footerHtml = '',
		readOnly = false,
		placeholder = 'Edit HTML here...',
		showPlaceholders = true,
		minHeightClass = 'min-h-[480px]'
	}: {
		html?: string;
		documentTitle?: string;
		setting?: PrintDocumentLayoutInput | null;
		headerHtml?: string;
		footerHtml?: string;
		readOnly?: boolean;
		placeholder?: string;
		showPlaceholders?: boolean;
		minHeightClass?: string;
	} = $props();

	const toastService = new ToastService();
	let showPlaceholderPanel = $state(false);
	let previewIframe = $state<HTMLIFrameElement | null>(null);

	const previewHtml = $derived(
		buildDocumentMasterPreviewHtml({
			documentHtml: html,
			documentTitle,
			headerHtml,
			footerHtml,
			setting
		})
	);

	$effect(() => {
		const iframe = previewIframe;
		const content = previewHtml;
		if (!iframe) return;
		const doc = iframe.contentDocument;
		if (!doc) return;
		doc.open();
		doc.write(content);
		doc.close();
	});

	function handleFormatHtml() {
		html = formatHtmlForEditor(html);
		toastSuccess(
			toastService,
			m.entity_document(),
			m.toast_action_formatted(),
			'Indentation and line breaks were normalized.'
		);
	}

	function copyPlaceholder(key: string) {
		navigator.clipboard.writeText(key);
		toastService.addToast(
			'Placeholder copied to clipboard',
			StatusColorEnum.INFO,
			key
		);
	}

	function insertPlaceholder(key: string) {
		html = appendPlaceholderToHtml(html, key);
		toastService.addToast(`Inserted: ${key}`, StatusColorEnum.INFO);
	}
</script>

<div class="space-y-3">
	{#if !readOnly}
		<div class="flex flex-wrap items-center gap-2">
			<WashButton
				className="btn-outline btn-xs"
				onClick={handleFormatHtml}
			>
				Format HTML
			</WashButton>
			{#if showPlaceholders}
				<WashButton
					className="btn-ghost btn-xs"
					onClick={() =>
						(showPlaceholderPanel = !showPlaceholderPanel)}
				>
					{showPlaceholderPanel ? 'Hide' : 'Show'} placeholders
				</WashButton>
			{/if}
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
		<div class="flex min-h-0 flex-col gap-2">
			<span class="text-sm font-medium">HTML</span>
			{#if readOnly}
				<pre
					class="textarea-bordered textarea {minHeightClass} w-full overflow-auto font-mono text-xs whitespace-pre-wrap"
				>{html || 'No content'}</pre>
			{:else}
				<textarea
					class="textarea-bordered textarea {minHeightClass} w-full font-mono text-sm"
					bind:value={html}
					{placeholder}
				></textarea>
			{/if}
		</div>

		<div class="flex min-h-0 flex-col gap-2">
			<span class="text-sm font-medium">Print preview</span>
			<div
				class="overflow-hidden rounded-lg border border-base-300 bg-white"
			>
				<iframe
					bind:this={previewIframe}
					title="Document print preview"
					class="{minHeightClass} w-full border-0 bg-white"
					sandbox="allow-same-origin"
				></iframe>
			</div>
		</div>
	</div>

	{#if showPlaceholders && showPlaceholderPanel && !readOnly}
		<div class="rounded-lg border border-base-300 bg-base-200 p-4">
			<h3 class="mb-3 text-sm font-semibold">Placeholders</h3>
			<div class="max-h-64 space-y-4 overflow-y-auto">
				{#each DOCUMENT_TEMPLATE_PLACEHOLDERS as category (category.category)}
					<div>
						<h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/70">
							{category.category}
						</h4>
						<div class="flex flex-wrap gap-2">
							{#each category.placeholders as ph (ph.key)}
								<div
									class="flex items-center gap-1 rounded-md border border-base-300 bg-base-100 px-2 py-1"
								>
									<code class="text-xs">{ph.key}</code>
									<button
										type="button"
										class="btn btn-ghost btn-xs"
										title="Copy"
										onclick={() => copyPlaceholder(ph.key)}
									>
										Copy
									</button>
									<button
										type="button"
										class="btn btn-ghost btn-xs"
										title="Insert"
										onclick={() => insertPlaceholder(ph.key)}
									>
										Insert
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
