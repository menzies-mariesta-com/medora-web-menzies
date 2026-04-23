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
	export let draftManualLine: any;

	export let searchItemsFn: (q: string) => Promise<SearchOpt[]>;
	export let searchManufacturersFn: (q: string) => Promise<SearchOpt[]>;
	export let getManufacturerLabelForValue: (value: string) => Promise<string>;
	export let onPickItem: (itemId: number) => void | Promise<void>;
	export let onClose: () => void;
	export let onSave: () => void;
</script>

<DaisyUiModal
	groupName="po-manual-line-dialog"
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
					value={draftManualLine?.itemId ? String(draftManualLine.itemId) : ''}
					searchFn={searchItemsFn}
					onChange={(v: string) => {
						if (v) void onPickItem(Number(v));
					}}
					placeholder="Search item…"
					className="w-full"
				/>
				<div class="mt-1 truncate text-sm font-medium">
					{draftManualLine?.itemId != null ? draftManualLine.itemLabel : '—'}
				</div>
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
						draftManualLine = { ...draftManualLine };
					}}
					placeholder="Select unit…"
					className="w-full"
					disabled={draftManualLine?.itemId == null}
				/>
				{#if draftManualLine?.itemId == null}
					<p class="mt-1 text-xs text-base-content/60">{m.inv_po_manual_unit_prereq()}</p>
				{:else if (draftManualLine?.iumList ?? []).length === 0}
					<p class="mt-1 text-xs text-warning">{m.inv_po_manual_unit_none_configured()}</p>
				{/if}
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
						draftManualLine = { ...draftManualLine };
					}}
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

