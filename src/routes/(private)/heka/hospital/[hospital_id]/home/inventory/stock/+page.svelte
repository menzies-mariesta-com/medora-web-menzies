<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import {
		trimInventoryNumericDisplay,
		trimMetricQtyDisplay
	} from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	let { data } = $props();
	const selectedInventoryFromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);
	/** When false, the API uses the store from the top bar. When true, all stores. */
	let stockListAllStores = $state(false);

	type AggRow = {
		storeId: number;
		itemId: number;
		itemName: string | null;
		storeName: string | null;
		totalQty: string;
		issueUnitName?: string | null;
	};

	type LotRow = {
		id: number;
		batchId: number;
		storeId: number;
		itemId: number;
		itemName: string | null;
		storeName: string | null;
		batchNo: string;
		expiryDate: string | null;
		purchasePrice: string;
		quantity: string;
		issueUnitName?: string | null;
	};

	let view = $state<'aggregated' | 'lots'>('aggregated');
	let rowsAgg = $state<AggRow[]>([]);
	let rowsLots = $state<LotRow[]>([]);
	let loading = $state(false);

	async function load() {
		if (!hospitalId) return;
		loading = true;
		try {
			const mode = view === 'lots' ? 'lots' : 'aggregated';
			const sp = new URLSearchParams();
			sp.set('mode', mode);
			if (
				!stockListAllStores &&
				selectedInventoryFromStoreId != null
			) {
				sp.set('storeId', String(selectedInventoryFromStoreId));
			}
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/stock?${sp.toString()}`,
				{ method: 'GET' }
			);
			if (view === 'lots') {
				const raw = (await res.json()) as Record<string, unknown>[];
				rowsLots = raw.map((r) => ({
					id: Number(r.id),
					batchId: Number(r.batchId),
					storeId: Number(r.storeId),
					itemId: Number(r.itemId),
					itemName: (r.itemName as string) ?? null,
					storeName: (r.storeName as string) ?? null,
					batchNo: String(r.batchNo ?? ''),
					expiryDate: (r.expiryDate as string) ?? null,
					purchasePrice: String(r.purchasePrice ?? ''),
					quantity: String(r.quantity ?? '0'),
					issueUnitName: (r.issueUnitName as string) ?? null
				}));
			} else {
				rowsAgg = (await res.json()) as AggRow[];
			}
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void view;
		void selectedInventoryFromStoreId;
		void stockListAllStores;
		void load();
	});

	const aggColumns: MariTableColumn<AggRow>[] = [
		{
			id: 'storeName',
			header: m.inv_common_store(),
			field: 'storeName',
			format: (v, row) => row.storeName ?? '—'
		},
		{
			id: 'itemName',
			header: 'Item',
			field: 'itemName',
			format: (v, row) => row.itemName ?? '—'
		},
		{
			id: 'totalQty',
			header: 'Qty (stock unit)',
			field: 'totalQty',
			format: (_v, row) => {
				const q = row.totalQty != null ? String(row.totalQty).trim() : '';
				const qtyDisp = q ? trimMetricQtyDisplay(q) : '';
				const iu = (row.issueUnitName ?? '').trim();
				if (!qtyDisp) return '—';
				return iu ? `${qtyDisp} ${iu}` : qtyDisp;
			}
		}
	];

	const lotColumns: MariTableColumn<LotRow>[] = [
		{
			id: 'storeName',
			header: m.inv_common_store(),
			field: 'storeName',
			format: (v, row) => row.storeName ?? '—'
		},
		{
			id: 'itemName',
			header: 'Item',
			field: 'itemName',
			format: (v, row) => row.itemName ?? '—'
		},
		{
			id: 'batchNo',
			header: m.inv_stock_col_batch(),
			field: 'batchNo'
		},
		{
			id: 'expiryDate',
			header: m.inv_stock_col_expiry(),
			field: 'expiryDate',
			format: (v) => v ?? '—'
		},
		{
			id: 'purchasePrice',
			header: m.inv_stock_col_price(),
			field: 'purchasePrice',
			format: (_v, row) => {
				const t =
					row.purchasePrice != null ? String(row.purchasePrice).trim() : '';
				return t ? trimInventoryNumericDisplay(t, 4) : '—';
			}
		},
		{
			id: 'quantity',
			header: 'Qty (stock unit)',
			field: 'quantity',
			format: (_v, row) => {
				const q = row.quantity != null ? String(row.quantity).trim() : '';
				const qtyDisp = q ? trimMetricQtyDisplay(q) : '';
				const iu = (row.issueUnitName ?? '').trim();
				if (!qtyDisp) return '—';
				return iu ? `${qtyDisp} ${iu}` : qtyDisp;
			}
		}
	];
</script>

<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
	<h1 class="text-lg font-semibold w-full sm:w-auto sm:mr-4">{m.inv_page_stock_title()}</h1>
	<div class="join">
		<DaisyUiButton
			type="button"
			className="join-item d-btn-sm {view === 'aggregated' ? 'd-btn-primary' : 'd-btn-outline'}"
			disabled={loading}
			onClick={() => {
				view = 'aggregated';
			}}
		>
			{m.inv_stock_view_by_item()}
		</DaisyUiButton>
		<DaisyUiButton
			type="button"
			className="join-item d-btn-sm {view === 'lots' ? 'd-btn-primary' : 'd-btn-outline'}"
			disabled={loading}
			onClick={() => {
				view = 'lots';
			}}
		>
			{m.inv_stock_view_by_lot()}
		</DaisyUiButton>
	</div>
	<div class="join w-full sm:w-auto">
		<DaisyUiButton
			type="button"
			className="join-item d-btn-sm {!stockListAllStores
				? 'd-btn-primary'
				: 'd-btn-outline'}"
			disabled={loading}
			onClick={() => {
				stockListAllStores = false;
			}}
		>
			{m.inv_list_scope_selected_store()}
		</DaisyUiButton>
		<DaisyUiButton
			type="button"
			className="join-item d-btn-sm {stockListAllStores
				? 'd-btn-primary'
				: 'd-btn-outline'}"
			disabled={loading}
			onClick={() => {
				stockListAllStores = true;
			}}
		>
			{m.inv_list_scope_all_stores()}
		</DaisyUiButton>
	</div>
</div>

<DaisyUiCard>
	<DaisyUiCardBody className="p-0">
		{#if view === 'aggregated'}
			<div class={TableEnum.HEIGHT}>
				<MariTable
					columns={aggColumns}
					rows={rowsAgg}
					isLoading={loading}
					showRefreshButton={false}
				/>
			</div>
		{:else}
			<div class={TableEnum.HEIGHT}>
				<MariTable
					columns={lotColumns}
					rows={rowsLots}
					isLoading={loading}
					showRefreshButton={false}
				/>
			</div>
		{/if}
	</DaisyUiCardBody>
</DaisyUiCard>
