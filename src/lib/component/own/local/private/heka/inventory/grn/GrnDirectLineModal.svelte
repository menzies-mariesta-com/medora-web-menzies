<script lang="ts">
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import { m } from '$lib/paraglide/messages';

	type SearchOpt = { label: string; value: string };

	export let open: boolean;
	export let editing: boolean;
	export let submitting: boolean;

	// NOTE: kept as `any` to avoid importing page-local types.
	export let draftDirectLine: any;

	export let searchItemsFn: (q: string) => Promise<SearchOpt[]>;
	export let onPickItem: (itemId: number) => void | Promise<void>;
	export let onClose: () => void;
	export let onSave: () => void;
</script>

<DaisyUiModal
	groupName="grn-direct-line-dialog"
	{open}
	onClose={() => onClose()}
	className="d-modal-middle"
>
	<div class="d-modal-box max-w-2xl" role="document">
		<h3 class="text-lg font-bold">{editing ? 'Edit line item' : 'Add line item'}</h3>
		<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<DaisyUiLabel className="text-xs opacity-80">{m.inv_pr_line_item_search()}</DaisyUiLabel>
				<DaisyUISearchSelect
					value={draftDirectLine?.itemId != null ? String(draftDirectLine.itemId) : ''}
					searchFn={searchItemsFn}
					onChange={(v: string) => {
						if (v) void onPickItem(Number(v));
					}}
					placeholder="Search item…"
					className="d-input w-full"
				/>
				<div class="mt-1 truncate text-sm font-medium">
					{draftDirectLine?.itemId != null ? draftDirectLine.itemLabel : '—'}
				</div>
			</div>
			<div>
				<DaisyUiLabel className="text-xs opacity-80">{m.inv_common_unit()}</DaisyUiLabel>
				<DaisyUISearchSelect
					value={draftDirectLine?.itemUnitMasterId != null ? String(draftDirectLine.itemUnitMasterId) : ''}
					options={(draftDirectLine?.iumList ?? []).map((u: any) => ({
						label: u.conversionDisplay,
						value: String(u.id)
					}))}
					onChange={(v: string) => {
						draftDirectLine.itemUnitMasterId = v ? Number(v) : null;
						draftDirectLine = { ...draftDirectLine };
					}}
					placeholder="Select unit…"
					className="d-input w-full"
					disabled={draftDirectLine?.itemId == null}
				/>
			</div>
			<div>
				<DaisyUiLabel className="text-xs opacity-80">{m.inv_grn_line_received_qty()}</DaisyUiLabel>
				<input
					type="text"
					class="d-input d-input-bordered w-full"
					bind:value={draftDirectLine.receivedQty}
					disabled={draftDirectLine?.itemId == null}
					aria-label={m.inv_grn_line_received_qty()}
				/>
			</div>
			<div>
				<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_batch()}</DaisyUiLabel>
				<input
					type="text"
					class="d-input d-input-bordered w-full"
					bind:value={draftDirectLine.batchNo}
					disabled={draftDirectLine?.itemId == null}
					aria-label={m.inv_stock_col_batch()}
				/>
			</div>
			<div>
				<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_expiry()}</DaisyUiLabel>
				<input
					type="date"
					class="d-input d-input-bordered w-full"
					bind:value={draftDirectLine.expiryDate}
					disabled={draftDirectLine?.itemId == null}
					aria-label={m.inv_stock_col_expiry()}
				/>
			</div>
			<div>
				<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_price()}</DaisyUiLabel>
				<input
					type="text"
					class="d-input d-input-bordered w-full"
					bind:value={draftDirectLine.purchasePrice}
					disabled={draftDirectLine?.itemId == null}
					aria-label={m.inv_stock_col_price()}
				/>
			</div>
		</div>
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

