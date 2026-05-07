<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any -- GRN-from-PO draft */
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
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
		<GrnLineReceiptFields draft={draftGrnFromPoLine} disableUnlessItem={false} open={true} />
	</div>
{/if}
<div class="d-modal-action mt-6">
	<DaisyUiButton type="button" className="d-btn" disabled={saving} onClick={() => cancel()}>
		{m.cancel()}
	</DaisyUiButton>
	<DaisyUiButton type="button" className="d-btn d-btn-primary" disabled={saving} onClick={() => void handleSave()}>
		{m.save()}
	</DaisyUiButton>
</div>
