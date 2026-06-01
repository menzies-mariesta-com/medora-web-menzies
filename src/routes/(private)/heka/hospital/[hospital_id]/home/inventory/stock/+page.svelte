<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import {
		trimInventoryNumericDisplay,
		trimMetricQtyDisplay
	} from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
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
		salePrice: string;
		empSalePrice: string;
		quantity: string;
		issueUnitName?: string | null;
	};

	let view = $state<'aggregated' | 'lots'>('aggregated');
	let rowsAgg = $state<AggRow[]>([]);
	let rowsLots = $state<LotRow[]>([]);
	let loading = $state(false);

	type LotsExpiryFilter = 'all' | 'expired' | 'expiringSoon';
	let lotsExpiryFilter = $state<LotsExpiryFilter>('all');

	function parseExpiryDate(s: string | null | undefined) {
		if (!s) return null;
		const d = new Date(s);
		return Number.isNaN(d.getTime()) ? null : d;
	}

	function isLotsExpiryMatch(
		expiryDate: string | null,
		filter: LotsExpiryFilter
	) {
		if (filter === 'all') return true;
		const d = parseExpiryDate(expiryDate);
		if (!d) return false;

		const now = new Date();
		const today = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate()
		);
		const days = (d.getTime() - today.getTime()) / 86_400_000;

		if (filter === 'expired') return days < 0;
		return days >= 0 && days <= 30;
	}

	const filteredRowsLotsByExpiry = $derived.by(() =>
		rowsLots.filter((r) =>
			isLotsExpiryMatch(r.expiryDate, lotsExpiryFilter)
		)
	);

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
					salePrice: String(r.salePrice ?? ''),
					empSalePrice: String(r.empSalePrice ?? ''),
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
			filterable: true,
			format: (v, row) => row.storeName ?? '—'
		},
		{
			id: 'itemName',
			header: 'Item',
			field: 'itemName',
			filterable: true,
			format: (v, row) => row.itemName ?? '—'
		},
		{
			id: 'totalQty',
			header: 'Qty (stock unit)',
			field: 'totalQty',
			filterable: true,
			format: (_v, row) => {
				const q =
					row.totalQty != null ? String(row.totalQty).trim() : '';
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
			filterable: true,
			format: (v, row) => row.storeName ?? '—'
		},
		{
			id: 'itemName',
			header: 'Item',
			field: 'itemName',
			filterable: true,
			format: (v, row) => row.itemName ?? '—'
		},
		{
			id: 'batchNo',
			header: m.inv_stock_col_batch(),
			field: 'batchNo',
			filterable: true
		},
		{
			id: 'expiryDate',
			header: m.inv_stock_col_expiry(),
			field: 'expiryDate',
			filterable: true,
			format: (v) => v ?? '—'
		},
		{
			id: 'purchasePrice',
			header: m.inv_stock_col_price(),
			field: 'purchasePrice',
			filterable: false,
			format: (_v, row) => {
				const t =
					row.purchasePrice != null
						? String(row.purchasePrice).trim()
						: '';
				return t ? trimInventoryNumericDisplay(t, 4) : '—';
			}
		},
		{
			id: 'salePrice',
			header: m.inv_stock_col_sale_price(),
			field: 'salePrice',
			filterable: false,
			format: (_v, row) => {
				const t =
					row.salePrice != null ? String(row.salePrice).trim() : '';
				return t ? trimInventoryNumericDisplay(t, 4) : '—';
			}
		},
		{
			id: 'empSalePrice',
			header: m.inv_stock_col_emp_sale_price(),
			field: 'empSalePrice',
			filterable: false,
			format: (_v, row) => {
				const t =
					row.empSalePrice != null
						? String(row.empSalePrice).trim()
						: '';
				return t ? trimInventoryNumericDisplay(t, 4) : '—';
			}
		},
		{
			id: 'quantity',
			header: 'Qty (stock unit)',
			field: 'quantity',
			filterable: true,
			format: (_v, row) => {
				const q =
					row.quantity != null ? String(row.quantity).trim() : '';
				const qtyDisp = q ? trimMetricQtyDisplay(q) : '';
				const iu = (row.issueUnitName ?? '').trim();
				if (!qtyDisp) return '—';
				return iu ? `${qtyDisp} ${iu}` : qtyDisp;
			}
		}
	];
</script>

<div
	class="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
>
	<h1 class="w-full text-lg font-semibold sm:mr-4 sm:w-auto">
		{m.inv_page_stock_title()}
	</h1>
	<div class="join">
		<DaisyUiButton
			type="button"
			className="join-item d-btn-sm {view === 'aggregated'
				? 'd-btn-primary'
				: 'd-btn-outline'}"
			disabled={loading}
			onClick={() => {
				view = 'aggregated';
			}}
		>
			{m.inv_stock_view_by_item()}
		</DaisyUiButton>
		<DaisyUiButton
			type="button"
			className="join-item d-btn-sm {view === 'lots'
				? 'd-btn-primary'
				: 'd-btn-outline'}"
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
	{#if view === 'lots'}
		<select
			class="d-select-bordered d-select w-full d-select-sm sm:w-44"
			bind:value={lotsExpiryFilter}
		>
			<option value="all">All expiry</option>
			<option value="expired">Expired</option>
			<option value="expiringSoon">Expiring soon (≤ 30 days)</option>
		</select>
	{/if}
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
					enableColumnFilters={false}
				/>
			</div>
		{:else}
			<div class={TableEnum.HEIGHT}>
				<MariTable
					columns={lotColumns}
					rows={filteredRowsLotsByExpiry}
					isLoading={loading}
					showRefreshButton={false}
					enableColumnFilters={false}
				/>
			</div>
		{/if}
	</DaisyUiCardBody>
</DaisyUiCard>
