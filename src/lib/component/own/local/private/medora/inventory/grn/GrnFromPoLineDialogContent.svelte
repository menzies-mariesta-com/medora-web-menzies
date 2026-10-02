<script lang="ts">
	 
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import GrnLineReceiptFields from './GrnLineReceiptFields.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';

	let {
		confirm,
		cancel,
		draftGrnFromPoLine,
		onSaveAttempt
	}: DialogSlotProps & {
		draftGrnFromPoLine: any;
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
	{#if draftGrnFromPoLine}
		<GrnLineReceiptFields
			draft={draftGrnFromPoLine}
			disableUnlessItem={false}
			open={true}
		/>
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
