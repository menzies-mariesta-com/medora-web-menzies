<script lang="ts">
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import { m } from '$lib/paraglide/messages';

	type SearchOpt = { label: string; value: string };

	export let open: boolean;
	export let submitting: boolean;

	// NOTE: kept as `any` to avoid importing page-local types.
	export let draftPoPrLine: any;

	export let searchManufacturersFn: (q: string) => Promise<SearchOpt[]>;
	export let getManufacturerLabelForValue: (value: string) => Promise<string>;
	export let onClose: () => void;
	export let onSave: () => void;
</script>

<DaisyUiModal
	groupName="po-pr-line-dialog"
	{open}
	onClose={() => onClose()}
	className="d-modal-middle"
>
	<div class="d-modal-box max-w-lg" role="document">
		<h3 class="text-lg font-bold">Edit line</h3>
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
							draftPoPrLine = { ...draftPoPrLine, manufacturerId: v };
						}}
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

