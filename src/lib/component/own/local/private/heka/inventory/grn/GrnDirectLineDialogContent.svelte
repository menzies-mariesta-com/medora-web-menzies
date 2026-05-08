<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- GRN direct draft */
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import GrnLineReceiptFields from './GrnLineReceiptFields.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';

	type SearchOpt = { label: string; value: string };

	let {
		confirm,
		cancel,
		draftDirectLine,
		searchItemsFn,
		onPickItem,
		onSaveAttempt
	}: DialogSlotProps & {
		draftDirectLine: any;
		searchItemsFn: (q: string) => Promise<SearchOpt[]>;
		onPickItem: (itemId: number) => void | Promise<void>;
		onSaveAttempt: () => boolean;
	} = $props();

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
			value={draftDirectLine?.itemId != null ? String(draftDirectLine.itemId) : ''}
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
			value={draftDirectLine?.itemUnitMasterId != null ? String(draftDirectLine.itemUnitMasterId) : ''}
			options={(draftDirectLine?.iumList ?? []).map((u: any) => ({
				label: u.conversionDisplay,
				value: String(u.id)
			}))}
			onChange={(v: string) => {
				draftDirectLine.itemUnitMasterId = v ? Number(v) : null;
			}}
			placeholder={m.inv_line_modal_select_conversion()}
			className="w-full"
			disabled={draftDirectLine?.itemId == null}
		/>
	</div>
	<div class="sm:col-span-2">
		<GrnLineReceiptFields draft={draftDirectLine} disableUnlessItem={true} open={true} />
	</div>
</div>
<div class="d-modal-action mt-6">
	<DaisyUiButton type="button" className="d-btn" disabled={saving} onClick={() => cancel()}>
		{m.cancel()}
	</DaisyUiButton>
	<DaisyUiButton type="button" className="d-btn d-btn-primary" disabled={saving} onClick={() => void handleSave()}>
		{m.save()}
	</DaisyUiButton>
</div>
