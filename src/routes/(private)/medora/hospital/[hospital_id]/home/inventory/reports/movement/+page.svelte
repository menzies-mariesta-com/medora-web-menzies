<script lang="ts">
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import type { MenziesTableExportConfig } from '$lib/model/type/menzies-table-export.type';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import {
		trimInventoryNumericDisplay,
		trimMetricQtyDisplay
	} from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import type { ClientReportExportColumn } from '$lib/tool/inventory/report-export-client.util';
	import { appendMenziesTableColumnFilters } from '$lib/tool/menzies/menzies-table-query.util';
	import { untrack } from 'svelte';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	type Row = {
		kind: string;
		refNo: string | null;
		storeId: number;
		storeName: string | null;
		itemId: number;
		itemName: string | null;
		batchNo: string | null;
		qty: string;
		empSalePrice: string | null;
		lineAmount: string | null;
		createdAt: string | null;
	};

	const apiBase = $derived(
		`/api/medora/hospital/${hospitalId}/home/inventory/reports/movement`
	);

	let rows = $state<Row[]>([]);
	let loading = $state(false);
	let errorMessage = $state('');
	let columnFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

	let filterDateFrom = $state('');
	let filterDateTo = $state('');

	function isIsoDateRangeInvalid(from: string, to: string): boolean {
		const f = from.trim();
		const t = to.trim();
		if (!f || !t) return false;
		return f > t;
	}

	const dateRangeInvalid = $derived(
		isIsoDateRangeInvalid(filterDateFrom, filterDateTo)
	);

	function buildApiUrl(exportLimit?: number): string {
		const sp = new URLSearchParams();
		sp.set('limit', String(exportLimit ?? 5000));
		if (filterDateFrom.trim()) sp.set('dateFrom', filterDateFrom.trim());
		if (filterDateTo.trim()) sp.set('dateTo', filterDateTo.trim());
		appendMenziesTableColumnFilters(sp, columnFilters);
		return `${apiBase}?${sp.toString()}`;
	}

	function mapMovementRows(raw: Record<string, unknown>[]): Row[] {
		return raw.map((r) => ({
			kind: String(r.kind ?? ''),
			refNo: (r.refNo as string) ?? null,
			storeId: Number(r.storeId),
			storeName: (r.storeName as string) ?? null,
			itemId: Number(r.itemId),
			itemName: (r.itemName as string) ?? null,
			batchNo: (r.batchNo as string) ?? null,
			qty: String(r.qty ?? r.quantity ?? '0'),
			empSalePrice: (r.empSalePrice as string) ?? null,
			lineAmount: (r.lineAmount as string) ?? null,
			createdAt: (r.createdAt as string) ?? null
		}));
	}

	async function load() {
		if (!hospitalId) return;
		if (dateRangeInvalid) return;
		loading = true;
		errorMessage = '';
		try {
			const res = await fetch(buildApiUrl(), {
				method: 'GET',
				cache: 'no-store'
			});
			if (!res.ok) {
				throw new Error(
					`Request failed (${res.status} ${res.statusText || 'Error'})`
				);
			}
			rows = mapMovementRows(
				(await res.json()) as Record<string, unknown>[]
			);
		} catch (e) {
			errorMessage =
				e instanceof Error ? e.message : 'Failed to load';
			rows = [];
		} finally {
			loading = false;
		}
	}

	async function fetchExportRows(): Promise<Record<string, unknown>[]> {
		if (!hospitalId || dateRangeInvalid) return [];
		const res = await fetch(buildApiUrl(10_000), {
			method: 'GET',
			cache: 'no-store'
		});
		if (!res.ok) {
			throw new Error(
				`Export failed (${res.status} ${res.statusText || 'Error'})`
			);
		}
		return mapMovementRows(
			(await res.json()) as Record<string, unknown>[]
		) as Record<string, unknown>[];
	}

	$effect(() => {
		void hospitalId;
		void filterDateFrom;
		void filterDateTo;
		untrack(() => {
			if (dateRangeInvalid) {
				rows = [];
				return;
			}
			void load();
		});
	});

	const kindFilterOptions = [
		{ value: 'grn', label: 'GRN' },
		{ value: 'dissue', label: 'DISSUE' },
		{ value: 'dconsume', label: 'DCONSUME' }
	];

	const columns: MenziesTableColumn<Row>[] = [
		{
			id: 'kind',
			header: m.inv_report_filter_kind(),
			field: 'kind',
			filterable: true,
			filterType: 'select',
			filterOptions: kindFilterOptions,
			filterEmptyLabel: m.inv_report_filter_kind_all(),
			format: (_v, row) => row.kind || '—'
		},
		{
			id: 'refNo',
			header: 'Ref no',
			field: 'refNo',
			filterable: true,
			format: (_v, row) => row.refNo ?? '—'
		},
		{
			id: 'storeId',
			header: m.inv_common_store(),
			field: 'storeName',
			filterable: true,
			filterType: 'select',
			filterMasterKey: 'store',
			filterEmptyLabel: m.inv_report_filter_store_all(),
			format: (_v, row) => row.storeName ?? '—'
		},
		{
			id: 'itemName',
			header: 'Item',
			field: 'itemName',
			filterable: true,
			format: (_v, row) => row.itemName ?? '—'
		},
		{
			id: 'batchNo',
			header: m.inv_stock_col_batch(),
			field: 'batchNo',
			filterable: true,
			format: (_v, row) => row.batchNo ?? '—'
		},
		{
			id: 'qty',
			header: 'Qty',
			field: 'qty',
			filterable: true,
			format: (_v, row) => trimMetricQtyDisplay(row.qty) || '—'
		},
		{
			id: 'empSalePrice',
			header: m.inv_stock_col_emp_sale_price(),
			field: 'empSalePrice',
			format: (_v, row) => {
				const t =
					row.empSalePrice != null
						? String(row.empSalePrice).trim()
						: '';
				return t ? trimInventoryNumericDisplay(t, 4) : '—';
			}
		},
		{
			id: 'lineAmount',
			header: m.inv_report_col_line_amount(),
			field: 'lineAmount',
			format: (_v, row) => {
				const t =
					row.lineAmount != null
						? String(row.lineAmount).trim()
						: '';
				return t ? trimInventoryNumericDisplay(t, 4) : '—';
			}
		},
		{
			id: 'createdAt',
			header: 'Created at',
			field: 'createdAt',
			filterable: true,
			format: (v) => (v != null ? String(v) : '—')
		}
	];

	const exportColumns: ClientReportExportColumn<Row>[] = [
		{ key: 'kind', header: m.inv_report_filter_kind() },
		{ key: 'refNo', header: 'Ref no', format: (r) => r.refNo ?? '' },
		{
			key: 'storeName',
			header: m.inv_common_store(),
			format: (r) => r.storeName ?? ''
		},
		{ key: 'itemName', header: 'Item', format: (r) => r.itemName ?? '' },
		{
			key: 'batchNo',
			header: m.inv_stock_col_batch(),
			format: (r) => r.batchNo ?? ''
		},
		{
			key: 'qty',
			header: 'Qty',
			format: (r) => trimMetricQtyDisplay(r.qty) || ''
		},
		{
			key: 'empSalePrice',
			header: m.inv_stock_col_emp_sale_price(),
			format: (r) => {
				const t =
					r.empSalePrice != null
						? String(r.empSalePrice).trim()
						: '';
				return t ? trimInventoryNumericDisplay(t, 4) : '';
			}
		},
		{
			key: 'lineAmount',
			header: m.inv_report_col_line_amount(),
			format: (r) => {
				const t =
					r.lineAmount != null ? String(r.lineAmount).trim() : '';
				return t ? trimInventoryNumericDisplay(t, 4) : '';
			}
		},
		{
			key: 'createdAt',
			header: 'Created at',
			format: (r) => r.createdAt ?? ''
		}
	];

	const exportSubtitle = $derived.by(() => {
		const parts: string[] = [];
		if (filterDateFrom) parts.push(`From: ${filterDateFrom}`);
		if (filterDateTo) parts.push(`To: ${filterDateTo}`);
		return parts.join(' · ');
	});

	const exportConfig = $derived<MenziesTableExportConfig>({
		columns:
			exportColumns as ClientReportExportColumn<Record<string, unknown>>[],
		title: m.inv_reports_movement(),
		subtitle: exportSubtitle,
		fetchExportRows
	});
</script>

<h1 class="mb-4 text-lg font-semibold">{m.inv_reports_movement()}</h1>

<WashCard className="mb-4">
	<WashCardBody>
		<div class="flex flex-wrap items-end gap-4">
			<div>
				<label class="text-xs opacity-80">{m.inv_report_filter_date_from()}</label>
				<input
					type="date"
					class="input-bordered input input-sm mt-1 w-full min-w-[10rem]"
					class:input-error={dateRangeInvalid}
					max={filterDateTo.trim() || undefined}
					bind:value={filterDateFrom}
				/>
			</div>
			<div>
				<label class="text-xs opacity-80">{m.inv_report_filter_date_to()}</label>
				<input
					type="date"
					class="input-bordered input input-sm mt-1 w-full min-w-[10rem]"
					class:input-error={dateRangeInvalid}
					min={filterDateFrom.trim() || undefined}
					bind:value={filterDateTo}
				/>
			</div>
		</div>
		{#if dateRangeInvalid}
			<p class="mt-2 text-sm text-error" role="alert">
				{m.inv_report_date_range_invalid()}
			</p>
		{/if}
	</WashCardBody>
</WashCard>

{#if errorMessage}
	<div class="mb-3">
		<WashAlert
			type={StatusColorEnum.ERROR}
			message="Failed to load report"
			detail={errorMessage}
		/>
	</div>
{/if}

<WashCard>
	<WashCardBody className="p-0">
		<div class={TableEnum.HEIGHT}>
			<MenziesTable
				{columns}
				{rows}
				masterFilterHospitalId={hospitalId}
				isLoading={loading}
				enableColumnFilters={true}
				bind:columnFilters
				showRefreshButton={true}
				enableExport={!dateRangeInvalid}
				{exportConfig}
				on:refresh={() => void load()}
				on:filtersChange={(event) => {
					if (filterDebounceTimeout)
						clearTimeout(filterDebounceTimeout);
					columnFilters = event.detail.filters;
					filterDebounceTimeout = setTimeout(
						() => void load(),
						350
					);
				}}
			/>
		</div>
	</WashCardBody>
</WashCard>
