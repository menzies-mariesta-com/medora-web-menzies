<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- GRN direct draft */
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
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
		onSyncFreeUnit,
		onSaveAttempt
	}: DialogSlotProps & {
		draftDirectLine: any;
		searchItemsFn: (q: string) => Promise<SearchOpt[]>;
		onPickItem: (itemId: number) => void | Promise<void>;
		onSyncFreeUnit?: () => void;
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
		<label class="text-xs opacity-80">{m.inv_pr_line_item_search()}</label>
		<WashSearchSelect
			value={draftDirectLine?.itemId != null
				? String(draftDirectLine.itemId)
				: ''}
			searchFn={searchItemsFn}
			onChange={(v: string) => {
				if (v) void onPickItem(Number(v));
			}}
			placeholder={m.inv_line_modal_search_item()}
			className="w-full"
		/>
	</div>
	<div>
		<label class="text-xs opacity-80">{m.inv_common_unit()}</label>
		<WashSearchSelect
			value={draftDirectLine?.itemUnitMasterId != null
				? String(draftDirectLine.itemUnitMasterId)
				: ''}
			options={(draftDirectLine?.iumList ?? []).map((u: any) => ({
				label: u.conversionDisplay,
				value: String(u.id)
			}))}
			onChange={(v: string) => {
				draftDirectLine.itemUnitMasterId = v ? Number(v) : null;
				onSyncFreeUnit?.();
			}}
			placeholder={m.inv_line_modal_select_conversion()}
			className="w-full"
			disabled={draftDirectLine?.itemId == null}
		/>
	</div>
	<div class="sm:col-span-2">
		<GrnLineReceiptFields
			draft={draftDirectLine}
			disableUnlessItem={true}
			open={true}
		/>
	</div>
</div>
<div class="modal-action mt-6">
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
</div>
