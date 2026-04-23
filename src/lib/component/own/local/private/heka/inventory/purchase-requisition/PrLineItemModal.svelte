<script lang="ts">
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import { m } from '$lib/paraglide/messages';

	type SearchOpt = { label: string; value: string };

	export let open: boolean;
	export let title: string;
	export let submitting: boolean;

	// NOTE: kept as `any`-ish to avoid importing page-local types.
	export let draftLine: any;

	export let searchItemsFn: (q: string) => Promise<SearchOpt[]>;
	export let onPickItem: (itemId: number) => void | Promise<void>;
	export let onClose: () => void;
	export let onSave: () => void;
</script>

<DaisyUiModal
	groupName="pr-line-dialog"
	{open}
	onClose={() => onClose()}
	className="d-modal-middle"
>
	<div class="d-modal-box max-w-2xl" role="document">
		<h3 class="text-lg font-bold">{title}</h3>

		<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<DaisyUiLabel className="text-xs opacity-80">{m.inv_pr_line_item_search()}</DaisyUiLabel>
				<DaisyUISearchSelect
					value={draftLine?.itemId ? String(draftLine.itemId) : ''}
					searchFn={searchItemsFn}
					onChange={(v: string) => {
						if (v) void onPickItem(Number(v));
					}}
					placeholder="Search item..."
					className="w-full"
				/>
				<div class="mt-1 truncate text-sm font-medium">
					{draftLine?.itemId != null ? draftLine.itemLabel : '—'}
				</div>
			</div>

			<div>
				<DaisyUiLabel className="text-xs opacity-80">Conversion</DaisyUiLabel>
				<DaisyUISearchSelect
					value={draftLine?.itemUnitMasterId != null ? String(draftLine.itemUnitMasterId) : ''}
					options={(draftLine?.iumList ?? []).map((u: any) => ({
						label: u.conversionDisplay,
						value: String(u.id)
					}))}
					onChange={(v: string) => {
						draftLine.itemUnitMasterId = v ? Number(v) : null;
						draftLine = { ...draftLine };
					}}
					placeholder="Select Unit..."
					className="w-full"
					disabled={draftLine?.itemId == null}
				/>
			</div>

			<div>
				<DaisyUiLabel className="text-xs opacity-80">Quantity</DaisyUiLabel>
				<input
					type="text"
					class="d-input d-input-bordered w-full"
					bind:value={draftLine.quantity}
					disabled={draftLine?.itemId == null}
					aria-label="Quantity"
				/>
			</div>
		</div>

		<div class="d-modal-action mt-6">
			<DaisyUiButton type="button" className="d-btn" disabled={submitting} onClick={() => onClose()}>
				{m.cancel()}
			</DaisyUiButton>
			<DaisyUiButton
				type="button"
				className="d-btn d-btn-primary"
				disabled={submitting}
				onClick={() => onSave()}
			>
				Save
			</DaisyUiButton>
		</div>
	</div>
</DaisyUiModal>

