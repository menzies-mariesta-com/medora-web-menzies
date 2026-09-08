<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- PO manual draft shape */
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { LineItemMetricTile } from '$lib/tool/inventory/line-item-metric-tiles.util';
	import { trimInventoryDraftNumericFieldsInPlace } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import InventoryLineItemMetricTiles from '../InventoryLineItemMetricTiles.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';

	type SearchOpt = { label: string; value: string };

	let {
		confirm,
		cancel,
		draftManualLine,
		searchItemsFn,
		onPickItem,
		onSaveAttempt,
		lineItemMetricTiles = null,
		getLineItemMetricTiles
	}: DialogSlotProps & {
		draftManualLine: any;
		searchItemsFn: (q: string) => Promise<SearchOpt[]>;
		onPickItem: (itemId: number) => void | Promise<void>;
		onSaveAttempt: () => boolean;
		lineItemMetricTiles?: LineItemMetricTile[] | null;
		/** Prefer over `lineItemMetricTiles` when dialog props are snapshotted (global modal). */
		getLineItemMetricTiles?: () => LineItemMetricTile[] | null;
	} = $props();

	/** Global dialog spreads props once; a getter reads live parent state for metric tiles. */
	const resolvedMetricTiles = $derived.by(() =>
		getLineItemMetricTiles != null
			? getLineItemMetricTiles()
			: lineItemMetricTiles
	);

	let trimmedOnce = false;
	$effect(() => {
		if (!draftManualLine || trimmedOnce) return;
		trimInventoryDraftNumericFieldsInPlace(
			draftManualLine as Record<string, unknown>,
			['quantity', 'unitPrice']
		);
		trimmedOnce = true;
	});

	let saving = $state(false);
	let pickingItem = $state(false);

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
		<label class="text-xs opacity-80">{m.inv_pr_line_item_search()}</label>
		<WashSearchSelect
			value={draftManualLine?.itemId
				? String(draftManualLine.itemId)
				: ''}
			searchFn={searchItemsFn}
			onChange={async (v: string) => {
				if (!v) return;
				pickingItem = true;
				try {
					await onPickItem(Number(v));
				} finally {
					pickingItem = false;
				}
			}}
			placeholder={m.inv_line_modal_search_item()}
			className="w-full"
		/>
	</div>

	<div>
		<label class="text-xs opacity-80">{m.inv_common_unit()}</label>
		<WashSearchSelect
			value={draftManualLine?.itemUnitMasterId != null
				? String(draftManualLine.itemUnitMasterId)
				: ''}
			options={(draftManualLine?.iumList ?? []).map((u: any) => ({
				label: u.conversionDisplay,
				value: String(u.id)
			}))}
			onChange={(v: string) => {
				draftManualLine.itemUnitMasterId = v ? Number(v) : null;
			}}
			placeholder={m.inv_line_modal_select_conversion()}
			className="w-full"
			disabled={draftManualLine?.itemId == null || pickingItem}
		/>
	</div>

	<div>
		<label class="text-xs opacity-80">{m.inv_common_quantity()}</label>
		<input
			type="number"
			class="input-bordered input w-full"
			value={draftManualLine.quantity == null ||
			draftManualLine.quantity === ''
				? ''
				: String(draftManualLine.quantity)}
			oninput={(e) => {
				draftManualLine.quantity = e.currentTarget.value;
			}}
			step="1"
			min="0"
			disabled={draftManualLine?.itemId == null || pickingItem}
			aria-label={m.inv_common_quantity()}
		/>
	</div>

	<div>
		<label class="text-xs opacity-80">{m.inv_po_line_unit_price()}</label>
		<input
			type="number"
			class="input-bordered input w-full"
			value={draftManualLine.unitPrice == null ||
			draftManualLine.unitPrice === ''
				? ''
				: String(draftManualLine.unitPrice)}
			oninput={(e) => {
				draftManualLine.unitPrice = e.currentTarget.value;
			}}
			step="0.01"
			min="0"
			disabled={draftManualLine?.itemId == null || pickingItem}
			aria-label={m.inv_po_line_unit_price()}
		/>
	</div>
</div>

<InventoryLineItemMetricTiles
	tiles={resolvedMetricTiles}
	draftLine={draftManualLine}
/>

<div class="modal-action mt-6">
	<WashButton
		type="button"
		className="btn"
		disabled={saving || pickingItem}
		onClick={() => cancel()}
	>
		{m.cancel()}
	</WashButton>
	<WashButton
		type="button"
		className="btn btn-primary"
		disabled={saving || pickingItem}
		loading={pickingItem}
		loadingText="Loading item…"
		onClick={() => void handleSave()}
	>
		{m.save()}
	</WashButton>
</div>
