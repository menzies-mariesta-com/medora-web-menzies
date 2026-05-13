<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- PO-from-PR line draft */
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import { m } from '$lib/paraglide/messages';
	import { trimInventoryDraftNumericFieldsInPlace } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';

	let {
		confirm,
		cancel,
		draftPoPrLine,
		onSaveAttempt
	}: DialogSlotProps & {
		draftPoPrLine: any;
		onSaveAttempt: () => boolean;
	} = $props();

	let trimmedOnce = false;
	$effect(() => {
		if (!draftPoPrLine || trimmedOnce) return;
		trimInventoryDraftNumericFieldsInPlace(
			draftPoPrLine as Record<string, unknown>,
			['quantity', 'unitPrice']
		);
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
			<DaisyUiLabel className="text-xs opacity-80"
				>{m.inv_common_quantity()}</DaisyUiLabel
			>
			<input
				type="number"
				class="d-input-bordered d-input w-full"
				value={draftPoPrLine.quantity == null ||
				draftPoPrLine.quantity === ''
					? ''
					: String(draftPoPrLine.quantity)}
				oninput={(e) => {
					draftPoPrLine.quantity = e.currentTarget.value;
				}}
				step="1"
				min="0"
				aria-label={m.inv_common_quantity()}
			/>
		</div>
		<div>
			<DaisyUiLabel className="text-xs opacity-80"
				>{m.inv_po_line_unit_price()}</DaisyUiLabel
			>
			<input
				type="number"
				class="d-input-bordered d-input w-full"
				value={draftPoPrLine.unitPrice == null ||
				draftPoPrLine.unitPrice === ''
					? ''
					: String(draftPoPrLine.unitPrice)}
				oninput={(e) => {
					draftPoPrLine.unitPrice = e.currentTarget.value;
				}}
				step="0.01"
				min="0"
				aria-label={m.inv_po_line_unit_price()}
			/>
		</div>
	</div>
{/if}
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
