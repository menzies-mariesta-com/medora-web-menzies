<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import type { InventoryReportPdfColumn } from '$lib/util/inventory-report-pdf.util';
	import { downloadInventoryReportPdf } from '$lib/util/inventory-report-pdf.util';
	import {
		buildReportApiUrl,
		fetchReportExport
	} from '$lib/tool/inventory/report-download.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';

	let {
		exportBaseUrl,
		queryParams = {},
		pdfTitle = '',
		pdfSubtitle = '',
		pdfColumns = [],
		pdfRows = [],
		disabled = false
	}: {
		exportBaseUrl: string;
		queryParams?: Record<string, string | number | undefined | null>;
		pdfTitle?: string;
		pdfSubtitle?: string;
		pdfColumns?: InventoryReportPdfColumn[];
		pdfRows?: Record<string, unknown>[];
		disabled?: boolean;
	} = $props();

	const toast = new ToastService();
	let exporting = $state(false);

	const apiUrl = $derived(buildReportApiUrl(exportBaseUrl, queryParams));

	async function onCsv() {
		exporting = true;
		try {
			await fetchReportExport(apiUrl, 'csv');
		} catch (e) {
			toast.addErrorToast(m.inv_report_export_csv(), e);
		} finally {
			exporting = false;
		}
	}

	async function onXlsx() {
		exporting = true;
		try {
			await fetchReportExport(apiUrl, 'xlsx');
		} catch (e) {
			toast.addErrorToast(m.inv_report_export_xlsx(), e);
		} finally {
			exporting = false;
		}
	}

	async function onPdf() {
		if (!pdfTitle || pdfColumns.length === 0) return;
		exporting = true;
		try {
			const stamp = new Date().toISOString().slice(0, 10);
			await downloadInventoryReportPdf({
				filename: `${pdfTitle.replace(/\s+/g, '-')}-${stamp}.pdf`,
				title: pdfTitle,
				subtitle: pdfSubtitle || undefined,
				columns: pdfColumns,
				rows: pdfRows
			});
		} catch (e) {
			toast.addErrorToast(m.inv_report_export_pdf(), e);
		} finally {
			exporting = false;
		}
	}

	const pdfEnabled = $derived(
		Boolean(pdfTitle && pdfColumns.length > 0 && pdfRows.length > 0)
	);
</script>

<div class="flex flex-wrap items-center gap-2">
	<DaisyUiButton
		type="button"
		className="d-btn-sm d-btn-outline"
		disabled={disabled || exporting}
		onClick={() => void onCsv()}
	>
		{m.inv_report_export_csv()}
	</DaisyUiButton>
	<DaisyUiButton
		type="button"
		className="d-btn-sm d-btn-outline"
		disabled={disabled || exporting}
		onClick={() => void onXlsx()}
	>
		{m.inv_report_export_xlsx()}
	</DaisyUiButton>
	{#if pdfEnabled}
		<DaisyUiButton
			type="button"
			className="d-btn-sm d-btn-outline"
			disabled={disabled || exporting}
			onClick={() => void onPdf()}
		>
			{m.inv_report_export_pdf()}
		</DaisyUiButton>
	{/if}
</div>
