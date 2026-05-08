<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- PO-from-PR line draft */
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import { m } from '$lib/paraglide/messages';
	import { trimInventoryDraftNumericFieldsInPlace } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';

	type SearchOpt = { label: string; value: string };

	let {
		confirm,
		cancel,
		draftPoPrLine,
		searchManufacturersFn,
		getManufacturerLabelForValue,
		onSaveAttempt
	}: DialogSlotProps & {
		draftPoPrLine: any;
		searchManufacturersFn: (q: string) => Promise<SearchOpt[]>;
		getManufacturerLabelForValue: (value: string) => Promise<string>;
		onSaveAttempt: () => boolean;
	} = $props();

	let trimmedOnce = false;
	$effect(() => {
		if (!draftPoPrLine || trimmedOnce) return;
		trimInventoryDraftNumericFieldsInPlace(draftPoPrLine as Record<string, unknown>, [
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

{#if draftPoPrLine}
	<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
		<div>
			<DaisyUiLabel className="text-xs opacity-80">{m.inv_common_quantity()}</DaisyUiLabel>
			<input
				type="text"
				class="d-input d-input-bordered w-full"
				bind:value={draftPoPrLine.quantity}
				aria-label={m.inv_common_quantity()}
			/>
		</div>
		<div>
			<DaisyUiLabel className="text-xs opacity-80">{m.inv_po_line_unit_price()}</DaisyUiLabel>
			<input
				type="text"
				class="d-input d-input-bordered w-full"
				bind:value={draftPoPrLine.unitPrice}
				aria-label={m.inv_po_line_unit_price()}
			/>
		</div>
		<div class="sm:col-span-2">
			<DaisyUiLabel className="text-xs opacity-80">{m.inv_common_manufacturer()}</DaisyUiLabel>
			<DaisyUISearchSelect
				value={draftPoPrLine.manufacturerId}
				placeholder={m.inv_common_manufacturer()}
				className="d-input w-full"
				searchFn={searchManufacturersFn}
				getLabelForValue={getManufacturerLabelForValue}
				minSearchLength={0}
				onChange={(v: string) => {
					if (!draftPoPrLine) return;
					draftPoPrLine.manufacturerId = v;
				}}
			/>
		</div>
	</div>
{/if}
<div class="d-modal-action mt-6">
	<DaisyUiButton type="button" className="d-btn" disabled={saving} onClick={() => cancel()}>
		{m.cancel()}
	</DaisyUiButton>
	<DaisyUiButton type="button" className="d-btn d-btn-primary" disabled={saving} onClick={() => void handleSave()}>
		{m.save()}
	</DaisyUiButton>
</div>
