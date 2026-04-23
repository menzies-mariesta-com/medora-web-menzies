<script lang="ts">
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import { m } from '$lib/paraglide/messages';

	export let open: boolean;
	export let submitting: boolean;

	// NOTE: kept as `any` to avoid importing page-local types.
	export let draftGrnFromPoLine: any;

	export let onClose: () => void;
	export let onSave: () => void;
</script>

<DaisyUiModal
	groupName="grn-po-line-dialog"
	{open}
	onClose={() => onClose()}
	className="d-modal-middle"
>
	<div class="d-modal-box max-w-lg" role="document">
		<h3 class="text-lg font-bold">Edit line</h3>
		{#if draftGrnFromPoLine}
			<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<DaisyUiLabel className="text-xs opacity-80">{m.inv_grn_line_received_qty()}</DaisyUiLabel>
					<input
						type="text"
						class="d-input d-input-bordered w-full"
						bind:value={draftGrnFromPoLine.receivedQty}
						aria-label={m.inv_grn_line_received_qty()}
					/>
				</div>
				<div>
					<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_batch()}</DaisyUiLabel>
					<input
						type="text"
						class="d-input d-input-bordered w-full"
						bind:value={draftGrnFromPoLine.batchNo}
						aria-label={m.inv_stock_col_batch()}
					/>
				</div>
				<div>
					<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_expiry()}</DaisyUiLabel>
					<input
						type="date"
						class="d-input d-input-bordered w-full"
						bind:value={draftGrnFromPoLine.expiryDate}
						aria-label={m.inv_stock_col_expiry()}
					/>
				</div>
				<div>
					<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_price()}</DaisyUiLabel>
					<input
						type="text"
						class="d-input d-input-bordered w-full"
						bind:value={draftGrnFromPoLine.purchasePrice}
						aria-label={m.inv_stock_col_price()}
					/>
				</div>
			</div>
		{/if}
		<div class="d-modal-action mt-6">
			<DaisyUiButton type="button" className="d-btn" disabled={submitting} onClick={() => onClose()}>
				{m.cancel()}
			</DaisyUiButton>
			<DaisyUiButton type="button" className="d-btn d-btn-primary" disabled={submitting} onClick={() => onSave()}>
				{m.save()}
			</DaisyUiButton>
		</div>
	</div>
</DaisyUiModal>

