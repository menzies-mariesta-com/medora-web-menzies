<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- PO manual draft shape */
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
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
		searchManufacturersFn,
		getManufacturerLabelForValue,
		onPickItem,
		onSaveAttempt,
		lineItemMetricTiles = null
	}: DialogSlotProps & {
		draftManualLine: any;
		searchItemsFn: (q: string) => Promise<SearchOpt[]>;
		searchManufacturersFn: (q: string) => Promise<SearchOpt[]>;
		getManufacturerLabelForValue: (value: string) => Promise<string>;
		onPickItem: (itemId: number) => void | Promise<void>;
		onSaveAttempt: () => boolean;
		lineItemMetricTiles?: LineItemMetricTile[] | null;
	} = $props();

	let trimmedOnce = false;
	$effect(() => {
		if (!draftManualLine || trimmedOnce) return;
		trimInventoryDraftNumericFieldsInPlace(draftManualLine as Record<string, unknown>, [
			'quantity',
			'unitPrice'
		]);
		trimmedOnce = true;
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
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_pr_line_item_search()}</DaisyUiLabel>
		<DaisyUISearchSelect
			value={draftManualLine?.itemId ? String(draftManualLine.itemId) : ''}
			searchFn={searchItemsFn}
			onChange={(v: string) => {
				if (v) void onPickItem(Number(v));
			}}
			placeholder={m.inv_line_modal_search_item()}
			className="w-full"
		/>
	</div>

	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_common_unit()}</DaisyUiLabel>
		<DaisyUISearchSelect
			value={draftManualLine?.itemUnitMasterId != null ? String(draftManualLine.itemUnitMasterId) : ''}
			options={(draftManualLine?.iumList ?? []).map((u: any) => ({
				label: u.conversionDisplay,
				value: String(u.id)
			}))}
			onChange={(v: string) => {
				draftManualLine.itemUnitMasterId = v ? Number(v) : null;
			}}
			placeholder={m.inv_line_modal_select_conversion()}
			className="w-full"
			disabled={draftManualLine?.itemId == null}
		/>
	</div>

	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_common_quantity()}</DaisyUiLabel>
		<input
			type="text"
			class="d-input d-input-bordered w-full"
			bind:value={draftManualLine.quantity}
			disabled={draftManualLine?.itemId == null}
			aria-label={m.inv_common_quantity()}
		/>
	</div>

	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_po_line_unit_price()}</DaisyUiLabel>
		<input
			type="text"
			class="d-input d-input-bordered w-full"
			bind:value={draftManualLine.unitPrice}
			disabled={draftManualLine?.itemId == null}
			aria-label={m.inv_po_line_unit_price()}
		/>
	</div>

	<div class="sm:col-span-2">
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_common_manufacturer()}</DaisyUiLabel>
		<DaisyUISearchSelect
			value={draftManualLine.manufacturerId}
			placeholder={m.inv_common_manufacturer()}
			className="d-input w-full"
			searchFn={searchManufacturersFn}
			getLabelForValue={getManufacturerLabelForValue}
			minSearchLength={0}
			onChange={(v: string) => {
				draftManualLine.manufacturerId = v;
			}}
		/>
	</div>
</div>

<InventoryLineItemMetricTiles tiles={lineItemMetricTiles} draftLine={draftManualLine} />

<div class="d-modal-action mt-6">
	<DaisyUiButton type="button" className="d-btn" disabled={saving} onClick={() => cancel()}>
		{m.cancel()}
	</DaisyUiButton>
	<DaisyUiButton type="button" className="d-btn d-btn-primary" disabled={saving} onClick={() => void handleSave()}>
		{m.save()}
	</DaisyUiButton>
</div>
