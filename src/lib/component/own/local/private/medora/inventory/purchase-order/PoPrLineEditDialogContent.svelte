<script lang="ts">
	 
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
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

<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
	{#if draftPoPrLine}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div>
				<label class="text-xs opacity-80" for="a11y-poprlineeditdialogconten-20f0ef">{m.inv_common_quantity()}</label>
				<input
					type="number"
					class="input-bordered input w-full"
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
				id="a11y-poprlineeditdialogconten-20f0ef" />
			</div>
			<div>
				<label class="text-xs opacity-80" for="a11y-poprlineeditdialogconten-521a71">{m.inv_po_line_unit_price()}</label>
				<input
					type="number"
					class="input-bordered input w-full"
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
				id="a11y-poprlineeditdialogconten-521a71" />
			</div>
		</div>
	{/if}
</div>
<WashDialogFooter>
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
</WashDialogFooter>
