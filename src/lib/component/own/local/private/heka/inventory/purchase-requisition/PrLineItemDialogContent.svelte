<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- shared draft line shape across PR/DI/issue flows */
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import { m } from '$lib/paraglide/messages';
	import { fetchStockLabelsForItemsAtStore } from '$lib/tool/inventory/fetch-stock-on-hand-for-items.util';
	import { enrichItemSearchOptionsWithStock } from '$lib/tool/inventory/fetch-stock-on-hand-for-items.util';
	import type { LineItemMetricTile } from '$lib/tool/inventory/line-item-metric-tiles.util';
	import { trimInventoryDraftNumericFieldsInPlace } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import InventoryLineItemMetricTiles from '../InventoryLineItemMetricTiles.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';

	type SearchOpt = { label: string; value: string };

	let {
		confirm,
		cancel,
		draftLine,
		searchItemsFn,
		stockEnrichment = null,
		onPickItem,
		onSaveAttempt,
		lineItemMetricTiles = null
	}: DialogSlotProps & {
		draftLine: any;
		searchItemsFn: (q: string) => Promise<SearchOpt[]>;
		stockEnrichment?: {
			hospitalId: string;
			selectedStoreId: number | null;
			toStoreId: number | null;
		} | null;
		onPickItem: (itemId: number) => void | Promise<void>;
		onSaveAttempt: () => boolean;
		lineItemMetricTiles?: LineItemMetricTile[] | null;
	} = $props();

	let lastTrimKey: string | null = null;
	$effect(() => {
		if (!draftLine) return;
		const k =
			typeof draftLine?.key === 'string'
				? (draftLine.key as string)
				: null;
		// Dialog component can be reused across opens; trim once per line key.
		if (k && lastTrimKey === k) return;
		trimInventoryDraftNumericFieldsInPlace(
			draftLine as Record<string, unknown>,
			['quantity']
		);
		lastTrimKey = k;
	});

	function purchaseUnitForDraftLine(): number | null {
		const list = (draftLine?.iumList ?? []) as Array<{
			id: number;
			purchaseUnitId?: number;
		}>;
		const selectedId = (draftLine?.itemUnitMasterId ?? null) as
			| number
			| null;
		const ium =
			selectedId != null
				? list.find((u) => u.id === selectedId)
				: undefined;
		return ium?.purchaseUnitId ?? null;
	}

	function getStoreIdsForItemSearch(se: {
		selectedStoreId: number | null;
		toStoreId: number | null;
	}): { fromStoreId: number | null; toStoreId: number | null } {
		return {
			fromStoreId: se.selectedStoreId,
			toStoreId: se.toStoreId
		};
	}

	async function searchItemsWithStock(
		q: string
	): Promise<SearchOpt[]> {
		const base = await searchItemsFn(q);
		const se = stockEnrichment;
		if (!se?.hospitalId) return base;

		const { fromStoreId, toStoreId } = getStoreIdsForItemSearch(se);
		if (fromStoreId == null && toStoreId == null) return base;

		const ids = base
			.map((o) => Number(o.value))
			.filter((n) => Number.isFinite(n) && n > 0);
		const uniq = [...new Set(ids)];
		if (uniq.length === 0) return base;

		const [fromMap, toMap] = await Promise.all([
			fromStoreId != null
				? fetchStockLabelsForItemsAtStore(
						se.hospitalId,
						fromStoreId,
						uniq
					)
				: Promise.resolve(new Map<number, string>()),
			toStoreId != null
				? fetchStockLabelsForItemsAtStore(
						se.hospitalId,
						toStoreId,
						uniq
					)
				: Promise.resolve(new Map<number, string>())
		]);

		return base.map((o) => {
			const id = Number(o.value);
			if (!Number.isFinite(id) || id <= 0) return o;

			const parts: string[] = [o.label.trim() || '—'];
			if (fromStoreId != null) {
				parts.push(`⬅ ${fromMap.get(id) ?? '0'}`);
			}
			if (toStoreId != null) {
				parts.push(`➡ ${toMap.get(id) ?? '0'}`);
			}

			return { value: o.value, label: parts.join(' · ') };
		});
	}

	let pickingItem = $state(false);

	let computedMetricTiles = $state<LineItemMetricTile[] | null>(null);
	$effect(() => {
		const se = stockEnrichment;
		const hospitalId = se?.hospitalId ?? '';
		const itemId = (draftLine?.itemId ?? null) as number | null;
		const unitId = purchaseUnitForDraftLine();
		const qty = String(draftLine?.quantity ?? '').trim();

		// Recompute whenever the draft inputs change.
		void itemId;
		void unitId;
		void qty;
		void se?.selectedStoreId;
		void se?.toStoreId;
		void hospitalId;

		if (!hospitalId || itemId == null || unitId == null) {
			computedMetricTiles = null;
			return;
		}

		const fromS = se?.selectedStoreId ?? null;
		const toS = se?.toStoreId ?? null;
		const tiles: LineItemMetricTile[] = [];

		(async () => {
			try {
				if (fromS != null) {
					const map = await fetchStockLabelsForItemsAtStore(
						hospitalId,
						fromS,
						[itemId]
					);
					tiles.push({
						label: m.inv_line_modal_on_hand_selected(),
						value: map.get(itemId) ?? '0'
					});
				}
				if (toS != null) {
					const map = await fetchStockLabelsForItemsAtStore(
						hospitalId,
						toS,
						[itemId]
					);
					tiles.push({
						label: m.inv_line_modal_on_hand_to(),
						value: map.get(itemId) ?? '0'
					});
				}
				tiles.push({
					label: m.inv_line_modal_metric_line_qty(),
					value: qty || '0',
					convertPurchaseQtyToIssueForDisplay: true
				});
				computedMetricTiles = tiles.length > 0 ? tiles : null;
			} catch {
				computedMetricTiles = null;
			}
		})().catch(() => {
			computedMetricTiles = null;
		});
	});

	let saving = $state(false);

	async function handleSave() {
		saving = true;
		try {
			if (!onSaveAttempt()) return;
			confirm();
		} finally {
			saving = false;
		}
	}
</script>

<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
	<div class="sm:col-span-2">
		<DaisyUiLabel className="text-xs opacity-80"
			>{m.inv_pr_line_item_search()}</DaisyUiLabel
		>
		<DaisyUISearchSelect
			value={draftLine?.itemId ? String(draftLine.itemId) : ''}
			searchFn={stockEnrichment
				? searchItemsWithStock
				: searchItemsFn}
			invalidateKey={stockEnrichment
				? `${stockEnrichment.hospitalId}:${stockEnrichment.selectedStoreId ?? ''}:${
						stockEnrichment.toStoreId ?? ''
					}`
				: undefined}
			onChange={(v: string) => {
				if (!v) return;
				void (async () => {
					pickingItem = true;
					try {
						await onPickItem(Number(v));
					} finally {
						pickingItem = false;
					}
				})();
			}}
			placeholder={m.inv_line_modal_search_item()}
			className="w-full"
		/>
	</div>

	<div>
		<DaisyUiLabel className="text-xs opacity-80"
			>{m.inv_common_unit()}</DaisyUiLabel
		>
		<DaisyUISearchSelect
			value={draftLine?.itemUnitMasterId != null
				? String(draftLine.itemUnitMasterId)
				: ''}
			options={(draftLine?.iumList ?? []).map((u: any) => ({
				label: u.conversionDisplay,
				value: String(u.id)
			}))}
			onChange={(v: string) => {
				draftLine.itemUnitMasterId = v ? Number(v) : null;
			}}
			placeholder={m.inv_line_modal_select_conversion()}
			className="w-full"
			disabled={draftLine?.itemId == null || pickingItem}
		/>
	</div>

	<div>
		<DaisyUiLabel className="text-xs opacity-80"
			>{m.inv_common_quantity()}</DaisyUiLabel
		>
		<input
			type="number"
			class="d-input-bordered d-input w-full"
			value={draftLine.quantity == null || draftLine.quantity === ''
				? ''
				: String(draftLine.quantity)}
			oninput={(e) => {
				draftLine.quantity = e.currentTarget.value;
			}}
			step="1"
			min="0"
			disabled={draftLine?.itemId == null || pickingItem}
			aria-label={m.inv_common_quantity()}
		/>
	</div>
</div>

<InventoryLineItemMetricTiles
	tiles={computedMetricTiles ?? lineItemMetricTiles}
	{draftLine}
/>

<div class="d-modal-action mt-6">
	<DaisyUiButton
		type="button"
		className="d-btn"
		disabled={saving}
		onClick={() => cancel()}
	>
		{m.cancel()}
	</DaisyUiButton>
	<DaisyUiButton
		type="button"
		className="d-btn d-btn-primary"
		disabled={saving}
		onClick={() => void handleSave()}
	>
		{m.save()}
	</DaisyUiButton>
</div>
