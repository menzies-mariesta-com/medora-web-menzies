<script lang="ts">
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import type { MariTableExportConfig } from '$lib/model/type/mari-table-export.type';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import type { ClientReportExportColumn } from '$lib/tool/inventory/report-export-client.util';
	import { appendMariTableColumnFilters } from '$lib/tool/mari/mari-table-query.util';
	import { untrack } from 'svelte';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	const apiBase = $derived(
		`/api/medora/hospital/${hospitalId}/home/inventory/reports/expired`
	);

	type Mode = 'expired' | 'expiringSoon';
	let mode = $state<Mode>('expired');
	const daysSoon = 30;

	type Row = {
		storeId: number;
		storeName: string | null;
		itemId: number;
		itemName: string | null;
		batchNo: string;
		expiryDate: string | null;
		qty: string;
	};

	let rows = $state<Row[]>([]);
	let loading = $state(false);
	let errorMessage = $state('');
	let columnFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

	function buildApiUrl(exportLimit?: number): string {
		const sp = new URLSearchParams();
		sp.set('mode', mode);
		sp.set('limit', String(exportLimit ?? 200));
		if (mode === 'expiringSoon') sp.set('daysSoon', String(daysSoon));
		appendMariTableColumnFilters(sp, columnFilters);
		return `${apiBase}?${sp.toString()}`;
	}

	function mapRows(raw: Record<string, unknown>[]): Row[] {
		return raw.map((r) => ({
			storeId: Number(r.storeId),
			storeName: (r.storeName as string) ?? null,
			itemId: Number(r.itemId),
			itemName: (r.itemName as string) ?? null,
			batchNo: String(r.batchNo ?? ''),
			expiryDate: (r.expiryDate as string) ?? null,
			qty: String(r.qty ?? r.quantity ?? '0')
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
		void mode;
		untrack(() => {
			void load();
		});
	});

	const columns: MariTableColumn<Row>[] = [
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
			format: (_v, row) => row.batchNo || '—'
		},
		{
			id: 'expiryDate',
			header: m.inv_stock_col_expiry(),
			field: 'expiryDate',
			filterable: true,
			format: (v) => v ?? '—'
		},
		{
			id: 'qty',
			header: 'Qty',
			field: 'qty',
			filterable: true,
			format: (_v, row) => (row.qty ?? '').trim() || '—'
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
		{
			key: 'batchNo',
			header: m.inv_stock_col_batch(),
			format: (r) => r.batchNo ?? ''
		},
		{
			key: 'expiryDate',
			header: m.inv_stock_col_expiry(),
			format: (r) => r.expiryDate ?? ''
		},
		{ key: 'qty', header: 'Qty', format: (r) => (r.qty ?? '').trim() }
	];

	const exportSubtitle = $derived(
		mode === 'expired'
			? 'Expired'
			: `Expiring soon (${daysSoon} days)`
	);

	const exportConfig = $derived<MariTableExportConfig>({
		columns:
			exportColumns as ClientReportExportColumn<Record<string, unknown>>[],
		title: 'Expired / expiring lots',
		subtitle: exportSubtitle,
		fetchExportRows
	});
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-lg font-semibold">Expired / expiring lots</h1>
	<div class="join">
		<WashButton
			type="button"
			className="join-item btn-sm {mode === 'expired'
				? 'btn-primary'
				: 'btn-outline'}"
			disabled={loading}
			onClick={() => {
				mode = 'expired';
			}}
		>
			Expired
		</WashButton>
		<WashButton
			type="button"
			className="join-item btn-sm {mode === 'expiringSoon'
				? 'btn-primary'
				: 'btn-outline'}"
			disabled={loading}
			onClick={() => {
				mode = 'expiringSoon';
			}}
		>
			Expiring soon ({daysSoon} days)
		</WashButton>
	</div>
</div>

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
			<MariTable
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
