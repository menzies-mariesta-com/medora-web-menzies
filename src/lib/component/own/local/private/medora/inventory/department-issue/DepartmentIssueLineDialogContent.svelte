<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import InventoryBatchQtyPickTable from '$lib/component/own/local/private/medora/inventory/InventoryBatchQtyPickTable.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type {
		ConsumptionBatchAllocationDraft,
		ConsumptionDraftLineIum
	} from '$lib/model/type/medora/department-consumption-detail.type';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { enrichItemSearchOptionsWithStock } from '$lib/tool/inventory/fetch-stock-on-hand-for-items.util';
	import { mapStockLotToBatchAllocationDraft } from '$lib/tool/inventory/map-stock-lot-to-batch-draft.util';
	import type { InventoryStockLotDto } from '$lib/model/type/medora/inventory-stock-lot.type';
	import { purchaseQtyToIssueQtyNumber } from '$lib/tool/inventory/purchase-issue-qty-convert.util';

	type DeptIssueDraftLine = {
		key: string;
		itemSearch: string;
		hits: { id: number; itemName: string | null }[];
		itemId: number | null;
		itemLabel: string;
		iumList: ConsumptionDraftLineIum[];
		itemUnitMasterId: number | null;
		batchAllocations: ConsumptionBatchAllocationDraft[];
		/** For indent mode: lock item selection */
		lockItem?: boolean;
		/** For indent mode: lock purchase unit label when iumList isn't loaded */
		purchaseUnitLabel?: string;
	};

	let {
		confirm,
		cancel,
		hospitalId,
		storeId,
		draftLine,
		searchItemsFn,
		onPersist
	}: DialogSlotProps & {
		hospitalId: string;
		storeId: number | null;
		draftLine: DeptIssueDraftLine;
		searchItemsFn: (
			q: string
		) => Promise<{ label: string; value: string }[]>;
		onPersist: () => void;
	} = $props();

	const toast = new ToastService();

	/** Local rows for batch table — avoids invalid `bind:` through dialog chrome on `draftLine.*`. */
	let batchAllocations = $state<ConsumptionBatchAllocationDraft[]>(
		[]
	);

	let lastAutoBatchFetchKey = $state<string | null>(null);
	const batchAutoFetchKey = $derived(
		`${draftLine.key}|${storeId ?? ''}|${draftLine.itemId ?? ''}`
	);

	let syncedDraftContextKey = $state<string | null>(null);
	$effect(() => {
		const ctx = `${draftLine.key}|${storeId ?? ''}`;
		if (ctx !== syncedDraftContextKey) {
			syncedDraftContextKey = ctx;
			batchAllocations = draftLine.batchAllocations.map((a) => ({
				...a
			}));
			lastAutoBatchFetchKey = null;
		}
	});

	async function searchItemsWithStock(q: string) {
		const base = await searchItemsFn(q);
		if (!hospitalId || storeId == null) return base;
		return enrichItemSearchOptionsWithStock(
			hospitalId,
			base,
			storeId
		);
	}

	async function hydrateLineItemMeta(
		line: DeptIssueDraftLine,
		itemId: number
	) {
		if (!hospitalId) return;
		line.itemId = itemId;
		const [detailRes, iumRes] = await Promise.all([
			fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?id=${itemId}`,
				{ method: 'GET' }
			),
			fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?mode=itemUnitMasters`,
				{ method: 'GET' }
			)
		]);
		const detail = (await detailRes.json()) as {
			itemName?: string | null;
			itemUnitMasterIds?: number[];
			defaultItemUnitMasterId?: number | null;
		};
		line.itemLabel = detail.itemName ?? '—';
		line.itemSearch = line.itemLabel;
		const allIum = (await iumRes.json()) as ConsumptionDraftLineIum[];
		const allowed = new Set(detail.itemUnitMasterIds ?? []);
		const allowedRows = allIum.filter((u) => allowed.has(u.id));
		const def = detail.defaultItemUnitMasterId;
		let chosen: ConsumptionDraftLineIum | undefined =
			def != null ? allowedRows.find((u) => u.id === def) : undefined;
		if (!chosen && allowedRows.length > 0) chosen = allowedRows[0];
		line.iumList = chosen ? [chosen] : [];
		line.itemUnitMasterId = chosen?.id ?? null;
		line.purchaseUnitLabel =
			chosen?.purchaseUnitName ?? line.purchaseUnitLabel;
		await refreshBatchAllocations(line);
	}

	async function refreshBatchAllocations(line: DeptIssueDraftLine) {
		batchAllocations = [];
		if (!hospitalId || storeId == null || line.itemId == null) return;
		try {
			const ps = new URLSearchParams();
			ps.set('mode', 'lots');
			ps.set('storeId', String(storeId));
			ps.set('itemId', String(line.itemId));
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/stock?${ps}`,
				{ method: 'GET' }
			);
			if (!res.ok) throw new Error(String(res.status));
			const rows = (await res.json()) as InventoryStockLotDto[];
			batchAllocations = rows
				.filter((r) => Number(r.quantity) > 1e-9)
				.map((r) => mapStockLotToBatchAllocationDraft(r));
		} catch (e) {
			toast.addToast(
				m.inv_dc_batch(),
				StatusColorEnum.ERROR,
				String(e)
			);
		}
	}

	async function onPickItem(itemId: number) {
		await hydrateLineItemMeta(draftLine, itemId);
	}

	const chosenIum = $derived(
		draftLine.iumList.find(
			(u) => u.id === draftLine.itemUnitMasterId
		) ?? null
	);

	const iumFactors = $derived(
		chosenIum
			? {
					purchaseConversionFactor:
						chosenIum.purchaseConversionFactor,
					issueConversionFactor: chosenIum.issueConversionFactor
				}
			: null
	);

	const lockedUnitLabel = $derived(
		draftLine.itemId == null
			? ''
			: (chosenIum?.conversionDisplay ??
					draftLine.iumList[0]?.conversionDisplay ??
					'')
	);

	const purchaseUnitLabel = $derived(
		(
			chosenIum?.purchaseUnitName ??
			draftLine.purchaseUnitLabel ??
			''
		).trim()
	);
	const issueUnitLabel = $derived(
		(chosenIum?.issueUnitName ?? '').trim()
	);

	let saving = $state(false);

	async function handleSave() {
		if (draftLine.itemId == null) {
			toast.addToast(
				m.inv_dc_edit_line(),
				StatusColorEnum.ERROR,
				m.inv_common_item()
			);
			return;
		}
		if (!iumFactors) {
			toast.addToast(
				m.inv_dc_edit_line(),
				StatusColorEnum.ERROR,
				m.inv_common_unit()
			);
			return;
		}
		let hasPositive = false;
		const {
			purchaseConversionFactor: pf,
			issueConversionFactor: iff
		} = iumFactors;
		for (const a of batchAllocations) {
			const qp = a.qtyPurchase.trim();
			if (!qp) continue;
			const n = Number(qp);
			if (!Number.isFinite(n) || n <= 0) {
				toast.addToast(
					m.inv_dc_edit_line(),
					StatusColorEnum.ERROR,
					m.inv_common_quantity()
				);
				return;
			}
			hasPositive = true;
			const need = purchaseQtyToIssueQtyNumber(qp, pf, iff);
			const avail = Number(a.stockIssueQty);
			if (need == null || need > avail + 1e-6) {
				toast.addToast(
					m.inv_dc_edit_line(),
					StatusColorEnum.ERROR,
					m.inv_dc_batch_qty_exceeds_stock()
				);
				return;
			}
		}
		if (!hasPositive) {
			toast.addToast(
				m.inv_dc_edit_line(),
				StatusColorEnum.ERROR,
				m.inv_common_quantity()
			);
			return;
		}
		saving = true;
		try {
			draftLine.batchAllocations = batchAllocations.map((a) => ({
				...a
			}));
			onPersist();
			confirm();
		} finally {
			saving = false;
		}
	}

	$effect(() => {
		// For indent mode, item is prefilled but iumList may be empty.
		// Hydrate item meta (IUM + default conversion) the same way as Consumption.
		if (!draftLine.lockItem || draftLine.itemId == null) return;

		if (draftLine.iumList.length === 0) {
			lastAutoBatchFetchKey = null;
			void hydrateLineItemMeta(draftLine, draftLine.itemId);
			return;
		}

		// Batch rows live in local state; guard so “no stock” (still []) does not loop forever.
		if (
			batchAllocations.length === 0 &&
			lastAutoBatchFetchKey !== batchAutoFetchKey
		) {
			lastAutoBatchFetchKey = batchAutoFetchKey;
			void refreshBatchAllocations(draftLine);
		}
	});
</script>

<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
	<div class="sm:col-span-2">
		<label class="text-xs opacity-80">{m.inv_pr_line_item_search()}</label>
		{#if draftLine.lockItem}
			<input
				type="text"
				readonly
				disabled
				class="input-bordered input mt-1 w-full cursor-not-allowed opacity-90"
				value={draftLine.itemLabel || '—'}
				title={draftLine.itemLabel || undefined}
				aria-label={m.inv_pr_line_item_search()}
			/>
		{:else}
			<WashSearchSelect
				value={draftLine.itemId ? String(draftLine.itemId) : ''}
				searchFn={searchItemsWithStock}
				invalidateKey={`${hospitalId}:${storeId ?? ''}`}
				onChange={(v: string) => {
					if (v) void onPickItem(Number(v));
				}}
				placeholder={m.inv_line_modal_search_item()}
				className="w-full"
			/>
		{/if}
	</div>

	<div class="sm:col-span-2">
		<label class="text-xs opacity-80">{m.inv_common_unit()}</label>
		<input
			type="text"
			readonly
			disabled
			class="input-bordered input mt-1 w-full cursor-not-allowed opacity-90"
			value={lockedUnitLabel || '—'}
			title={lockedUnitLabel || undefined}
			aria-label={m.inv_common_unit()}
		/>
	</div>

	<div class="sm:col-span-2">
		<label class="text-xs opacity-80">{m.inv_dc_batch()}</label>
		<p class="mb-2 text-xs opacity-70">
			{m.inv_dc_modal_batch_help()}
		</p>
		<InventoryBatchQtyPickTable
			bind:allocations={batchAllocations}
			factors={iumFactors}
			purchaseUnitLabel={purchaseUnitLabel || '—'}
			issueUnitLabel={issueUnitLabel || ''}
			disabled={draftLine.itemId == null || storeId == null}
			showSalePrice={false}
		/>
	</div>
</div>

<div class="modal-action mt-6">
	<WashButton
		type="button"
		className="btn"
		disabled={saving}
		onClick={() => cancel()}
	>
		{m.cancel()}
	</WashButton>
	<WashButton
		type="button"
		className="btn btn-primary"
		disabled={saving}
		onClick={() => void handleSave()}
	>
		{m.save()}
	</WashButton>
</div>
