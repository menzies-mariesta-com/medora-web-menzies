<script lang="ts">
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import { m } from '$lib/paraglide/messages';
	import { trimInventoryDraftNumericFieldsInPlace } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	export let draft: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- page-local GRN draft
	export let disableUnlessItem = false;
	/** When false (default), parents should toggle true when the modal opens so values normalize once. */
	export let open = false;

	const GRN_NUMERIC_FIELD_KEYS = [
		'receivedQty',
		'purchasePrice',
		'freeQty',
		'discountPercent',
		'discountAmount',
		'taxPercent',
		'taxAmount'
	] as const;

	let prevOpen = false;
	$: {
		const nowOpen = open;
		if (nowOpen && !prevOpen && draft) {
			trimInventoryDraftNumericFieldsInPlace(draft as Record<string, unknown>, GRN_NUMERIC_FIELD_KEYS);
		}
		prevOpen = nowOpen;
	}

	$: itemLocked = disableUnlessItem && draft?.itemId == null;
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_grn_line_received_qty()}</DaisyUiLabel>
		<input
			type="text"
			class="d-input d-input-bordered w-full"
			bind:value={draft.receivedQty}
			disabled={itemLocked}
			aria-label={m.inv_grn_line_received_qty()}
		/>
	</div>
	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_batch()}</DaisyUiLabel>
		<input
			type="text"
			class="d-input d-input-bordered w-full"
			bind:value={draft.batchNo}
			disabled={itemLocked}
			aria-label={m.inv_stock_col_batch()}
		/>
	</div>
	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_expiry()}</DaisyUiLabel>
		<input
			type="date"
			class="d-input d-input-bordered w-full"
			bind:value={draft.expiryDate}
			disabled={itemLocked}
			aria-label={m.inv_stock_col_expiry()}
		/>
	</div>
	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_price()}</DaisyUiLabel>
		<input
			type="text"
			class="d-input d-input-bordered w-full"
			bind:value={draft.purchasePrice}
			disabled={itemLocked}
			aria-label={m.inv_stock_col_price()}
		/>
	</div>
	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_grn_free_qty()}</DaisyUiLabel>
		<input
			type="text"
			class="d-input d-input-bordered w-full"
			bind:value={draft.freeQty}
			disabled={itemLocked}
			aria-label={m.inv_grn_free_qty()}
		/>
	</div>
	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_grn_discount_percent()}</DaisyUiLabel>
		<input
			type="text"
			class="d-input d-input-bordered w-full"
			bind:value={draft.discountPercent}
			disabled={itemLocked}
			aria-label={m.inv_grn_discount_percent()}
		/>
	</div>
	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_grn_discount_amount()}</DaisyUiLabel>
		<input
			type="text"
			class="d-input d-input-bordered w-full"
			bind:value={draft.discountAmount}
			disabled={itemLocked}
			aria-label={m.inv_grn_discount_amount()}
		/>
	</div>
	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_grn_tax_percent()}</DaisyUiLabel>
		<input
			type="text"
			class="d-input d-input-bordered w-full"
			bind:value={draft.taxPercent}
			disabled={itemLocked}
			aria-label={m.inv_grn_tax_percent()}
		/>
	</div>
	<div>
		<DaisyUiLabel className="text-xs opacity-80">{m.inv_grn_tax_amount()}</DaisyUiLabel>
		<input
			type="text"
			class="d-input d-input-bordered w-full"
			bind:value={draft.taxAmount}
			disabled={itemLocked}
			aria-label={m.inv_grn_tax_amount()}
		/>
	</div>
</div>
