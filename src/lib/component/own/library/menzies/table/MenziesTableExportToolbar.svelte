<script lang="ts">
	/**
	 * Design DataTableExportMenu (web 1.3.0): click/focus opens formats.
	 * `dropdown-no-hover` + `wash-dropdown-contained` so tooltips work while closed.
	 */
	import LucideDownload from '$lib/component/own/library/lucide/LucideDownload.svelte';
	import type { MenziesTableExportFormat } from '$lib/model/type/menzies-table-export.type';
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
	import {
		DROPDOWN_PANEL_OVERFLOW,
		DROPDOWN_PANEL_Z
	} from '@menzies-mariesta-com/menzies-design-wash-ui/core';

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
		formats?: MenziesTableExportFormat[];
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
	const busy = $derived(disabled || exporting);
	const menuItems = $derived(
		(
			[
				{
					format: 'xlsx' as const,
					label: m.inv_report_export_xlsx(),
					run: onXlsx
				},
				{
					format: 'csv' as const,
					label: m.inv_report_export_csv(),
					run: onCsv
				},
				{
					format: 'pdf' as const,
					label: m.inv_report_export_pdf(),
					run: onPdf
				},
				{
					format: 'print' as const,
					label: m.inv_report_export_print(),
					run: onPrint
				}
			] as const
		).filter((item) => formatSet.has(item.format))
	);

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

	function blurActive() {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	}

	async function runExport(run: () => Promise<void>) {
		await run();
		blurActive();
	}
</script>

{#if menuItems.length > 0}
	<div
		class="dropdown dropdown-end dropdown-bottom dropdown-no-hover wash-dropdown-contained"
	>
		<div class="tooltip tooltip-secondary" data-tip="Export">
			<div
				tabindex={busy ? -1 : 0}
				role="button"
				class="btn btn-ghost btn-square btn-sm btn-secondary {busy
					? 'btn-disabled cursor-not-allowed'
					: 'cursor-pointer'} {exporting ? 'loading' : ''}"
				aria-label="Export"
				aria-haspopup="menu"
				aria-busy={exporting || undefined}
				aria-disabled={busy || undefined}
			>
				{#if !exporting}
					<LucideDownload className="size-4" />
				{/if}
			</div>
		</div>
		{#if !busy}
			<ul
				tabindex="-1"
				role="menu"
				class="menu dropdown-content {DROPDOWN_PANEL_Z} mt-1 w-40 rounded-box border border-ink-border bg-base-100 p-2 shadow-[var(--shadow-paper-md)] {DROPDOWN_PANEL_OVERFLOW}"
			>
				{#each menuItems as item (item.format)}
					<li role="none">
						<button
							type="button"
							role="menuitem"
							class="cursor-pointer"
							onclick={() => void runExport(item.run)}
						>
							{item.label}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
