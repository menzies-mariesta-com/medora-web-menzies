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
	import type { ClientReportExportColumn } from '$lib/tool/inventory/report-export-client.util';
	import { appendMenziesTableColumnFilters } from '$lib/tool/menzies/menzies-table-query.util';
	import { untrack } from 'svelte';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	const apiBase = $derived(
		`/api/medora/hospital/${hospitalId}/home/inventory/reports/low-stock`
	);

	type Row = {
		storeId: number;
		storeName: string | null;
		itemId: number;
		itemName: string | null;
		qty: string;
		minQty: string;
	};

	let rows = $state<Row[]>([]);
	let loading = $state(false);
	let errorMessage = $state('');
	let columnFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

	function buildApiUrl(exportLimit?: number): string {
		const sp = new URLSearchParams();
		sp.set('limit', String(exportLimit ?? 5000));
		appendMenziesTableColumnFilters(sp, columnFilters);
		return `${apiBase}?${sp.toString()}`;
	}

	function mapRows(raw: Record<string, unknown>[]): Row[] {
		return raw.map((r) => ({
			storeId: Number(r.storeId),
			storeName: (r.storeName as string) ?? null,
			itemId: Number(r.itemId),
			itemName: (r.itemName as string) ?? null,
			qty: String(r.qty ?? r.quantity ?? '0'),
			minQty: String(r.minQty ?? '0')
		}));
	}

	async function load() {
		if (!hospitalId) return;
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
			rows = mapRows((await res.json()) as Record<string, unknown>[]);
		} catch (e) {
			errorMessage =
				e instanceof Error ? e.message : 'Failed to load';
			rows = [];
		} finally {
			loading = false;
		}
	}

	async function fetchExportRows(): Promise<Record<string, unknown>[]> {
		if (!hospitalId) return [];
		const res = await fetch(buildApiUrl(10_000), {
			method: 'GET',
			cache: 'no-store'
		});
		if (!res.ok) {
			throw new Error(
				`Export failed (${res.status} ${res.statusText || 'Error'})`
			);
		}
		return mapRows(
			(await res.json()) as Record<string, unknown>[]
		) as Record<string, unknown>[];
	}

	$effect(() => {
		void hospitalId;
		untrack(() => {
			void load();
		});
	});

	const columns: MenziesTableColumn<Row>[] = [
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
			id: 'qty',
			header: 'Qty',
			field: 'qty',
			filterable: true,
			format: (_v, row) => (row.qty ?? '').trim() || '—'
		},
		{
			id: 'minQty',
			header: 'Min qty',
			field: 'minQty',
			filterable: true,
			format: (_v, row) => (row.minQty ?? '').trim() || '—'
		}
	];

	const exportColumns: ClientReportExportColumn<Row>[] = [
		{
			key: 'storeName',
			header: m.inv_common_store(),
			format: (r) => r.storeName ?? ''
		},
		{
			key: 'itemName',
			header: m.inv_common_item(),
			format: (r) => r.itemName ?? ''
		},
		{ key: 'qty', header: 'On hand', format: (r) => (r.qty ?? '').trim() },
		{
			key: 'minQty',
			header: 'Min qty',
			format: (r) => (r.minQty ?? '').trim()
		}
	];

	const exportConfig = $derived<MenziesTableExportConfig>({
		columns:
			exportColumns as ClientReportExportColumn<Record<string, unknown>>[],
		title: 'Low stock',
		fetchExportRows
	});
</script>

<h1 class="mb-4 text-lg font-semibold">Low stock</h1>

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
				enableExport={true}
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
