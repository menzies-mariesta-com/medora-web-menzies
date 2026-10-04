<script lang="ts">
	 
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
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

<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<div class="sm:col-span-2">
			<label class="text-xs opacity-80" for="a11y-grndirectlinedialogconte-59c8a9">{m.inv_pr_line_item_search()}</label>
			<SearchSelect inputId="a11y-grndirectlinedialogconte-59c8a9"
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
			<label class="text-xs opacity-80" for="a11y-grndirectlinedialogconte-0feae4">{m.inv_common_unit()}</label>
			<SearchSelect inputId="a11y-grndirectlinedialogconte-0feae4"
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
