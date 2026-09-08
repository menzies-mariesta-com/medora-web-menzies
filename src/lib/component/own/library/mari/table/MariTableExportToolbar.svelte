<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type { MariTableExportFormat } from '$lib/model/type/mari-table-export.type';
	import {
		clientExportColumnsToPdfColumns,
		downloadRowsAsCsv,
		downloadRowsAsPdf,
		downloadRowsAsXlsx,
		printRowsAsTable,
		type ClientReportExportColumn
	} from '$lib/tool/inventory/report-export-client.util';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';

	let {
		columns,
		title,
		subtitle = '',
		disabled = false,
		filenameStem,
		formats = ['csv', 'xlsx', 'pdf', 'print'],
		getRows
	}: {
		columns: ClientReportExportColumn<Record<string, unknown>>[];
		title: string;
		subtitle?: string;
		disabled?: boolean;
		filenameStem?: string;
		formats?: MariTableExportFormat[];
		getRows: () => Promise<Record<string, unknown>[]>;
	} = $props();

	const toast = new ToastService();
	let exporting = $state(false);

	const stem = $derived(
		filenameStem ?? title.replace(/\s+/g, '-').toLowerCase()
	);
	const stamp = $derived(new Date().toISOString().slice(0, 10));
	const pdfColumns = $derived(clientExportColumnsToPdfColumns(columns));
	const formatSet = $derived(new Set(formats));

	async function resolveRows() {
		return await getRows();
	}

	async function onCsv() {
		exporting = true;
		try {
			const data = await resolveRows();
			downloadRowsAsCsv(columns, data, `${stem}-${stamp}`);
		} catch (e) {
			toast.addErrorToast(m.inv_report_export_csv(), e);
		} finally {
			exporting = false;
		}
	}

	async function onXlsx() {
		exporting = true;
		try {
			const data = await resolveRows();
			await downloadRowsAsXlsx(columns, data, `${stem}-${stamp}`, title);
		} catch (e) {
			toast.addErrorToast(m.inv_report_export_xlsx(), e);
		} finally {
			exporting = false;
		}
	}

	async function onPdf() {
		exporting = true;
		try {
			const data = await resolveRows();
			await downloadRowsAsPdf({
				filename: `${stem}-${stamp}.pdf`,
				title,
				subtitle: subtitle || undefined,
				columns: pdfColumns,
				rows: data
			});
		} catch (e) {
			toast.addErrorToast(m.inv_report_export_pdf(), e);
		} finally {
			exporting = false;
		}
	}

	async function onPrint() {
		exporting = true;
		try {
			const data = await resolveRows();
			printRowsAsTable({
				title,
				subtitle: subtitle || undefined,
				columns: pdfColumns,
				rows: data
			});
		} catch (e) {
			toast.addErrorToast(m.inv_report_export_print(), e);
		} finally {
			exporting = false;
		}
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	{#if formatSet.has('csv')}
		<WashButton
			type="button"
			className="btn-sm btn-outline"
			disabled={disabled || exporting}
			onClick={() => void onCsv()}
		>
			{m.inv_report_export_csv()}
		</WashButton>
	{/if}
	{#if formatSet.has('xlsx')}
		<WashButton
			type="button"
			className="btn-sm btn-outline"
			disabled={disabled || exporting}
			onClick={() => void onXlsx()}
		>
			{m.inv_report_export_xlsx()}
		</WashButton>
	{/if}
	{#if formatSet.has('pdf')}
		<WashButton
			type="button"
			className="btn-sm btn-outline"
			disabled={disabled || exporting}
			onClick={() => void onPdf()}
		>
			{m.inv_report_export_pdf()}
		</WashButton>
	{/if}
	{#if formatSet.has('print')}
		<WashButton
			type="button"
			className="btn-sm btn-outline"
			disabled={disabled || exporting}
			onClick={() => void onPrint()}
		>
			{m.inv_report_export_print()}
		</WashButton>
	{/if}
</div>
