<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- GRN-from-PO draft */
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
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

{#if draftGrnFromPoLine}
	<div class="mt-4">
		<GrnLineReceiptFields
			draft={draftGrnFromPoLine}
			disableUnlessItem={false}
			open={true}
		/>
	</div>
{/if}
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
