<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
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
		estimatedPurchasePrice: string;
		quantity: string;
		issueUnitName?: string | null;
		grnReceivedDate?: string | null;
		grnInvoiceNo?: string | null;
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
				`/api/medora/hospital/${hospitalId}/home/inventory/stock?${sp.toString()}`,
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
					estimatedPurchasePrice: String(r.estimatedPurchasePrice ?? ''),
					quantity: String(r.quantity ?? '0'),
					issueUnitName: (r.issueUnitName as string) ?? null,
					grnReceivedDate: (r.grnReceivedDate as string) ?? null,
					grnInvoiceNo: (r.grnInvoiceNo as string) ?? null
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

	const aggColumns: MenziesTableColumn<AggRow>[] = [
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

	const lotColumns: MenziesTableColumn<LotRow>[] = [
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
			id: 'grnReceivedDate',
			header: m.inv_stock_col_grn_receipt(),
			field: 'grnReceivedDate',
			filterable: true,
			format: (_v, row) => {
				const date = row.grnReceivedDate?.trim() ?? '';
				const inv = row.grnInvoiceNo?.trim() ?? '';
				if (date && inv) return `${date} · ${inv}`;
				return date || inv || '—';
			}
		},
		{
			id: 'estimatedPurchasePrice',
			header: m.inv_stock_col_estimated_purchase_price(),
			field: 'estimatedPurchasePrice',
			filterable: false,
			format: (_v, row) => {
				const t =
					row.estimatedPurchasePrice != null
						? String(row.estimatedPurchasePrice).trim()
						: '';
				if (!t) return '—';
				const iu = (row.issueUnitName ?? '').trim();
				const disp = trimInventoryNumericDisplay(t, 4);
				return iu ? `${disp} / ${iu}` : disp;
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
		<WashButton
			type="button"
			className="join-item btn-sm {view === 'aggregated'
				? 'btn-primary'
				: 'btn-outline'}"
			disabled={loading}
			onClick={() => {
				view = 'aggregated';
			}}
		>
			{m.inv_stock_view_by_item()}
		</WashButton>
		<WashButton
			type="button"
			className="join-item btn-sm {view === 'lots'
				? 'btn-primary'
				: 'btn-outline'}"
			disabled={loading}
			onClick={() => {
				view = 'lots';
			}}
		>
			{m.inv_stock_view_by_lot()}
		</WashButton>
	</div>
	<div class="join w-full sm:w-auto">
		<WashButton
			type="button"
			className="join-item btn-sm {!stockListAllStores
				? 'btn-primary'
				: 'btn-outline'}"
			disabled={loading}
			onClick={() => {
				stockListAllStores = false;
			}}
		>
			{m.inv_list_scope_selected_store()}
		</WashButton>
		<WashButton
			type="button"
			className="join-item btn-sm {stockListAllStores
				? 'btn-primary'
				: 'btn-outline'}"
			disabled={loading}
			onClick={() => {
				stockListAllStores = true;
			}}
		>
			{m.inv_list_scope_all_stores()}
		</WashButton>
	</div>
	{#if view === 'lots'}
		<select
			class="select-bordered select w-full select-sm sm:w-44"
			bind:value={lotsExpiryFilter}
		>
			<option value="all">All expiry</option>
			<option value="expired">Expired</option>
			<option value="expiringSoon">Expiring soon (≤ 30 days)</option>
		</select>
	{/if}
</div>

<WashCard>
	<WashCardBody className="p-0">
		{#if view === 'aggregated'}
			<div class={TableEnum.HEIGHT}>
				<MenziesTable
					columns={aggColumns}
					rows={rowsAgg}
					isLoading={loading}
					showRefreshButton={false}
					enableColumnFilters={false}
				/>
			</div>
		{:else}
			<div class={TableEnum.HEIGHT}>
				<MenziesTable
					columns={lotColumns}
					rows={filteredRowsLotsByExpiry}
					isLoading={loading}
					showRefreshButton={false}
					enableColumnFilters={false}
				/>
			</div>
		{/if}
	</WashCardBody>
</WashCard>
