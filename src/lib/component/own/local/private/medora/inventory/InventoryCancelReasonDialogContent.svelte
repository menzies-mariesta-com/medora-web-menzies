<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';

	let {
		confirm,
		cancel,
		confirmLabel,
		textareaAriaLabel,
		emptyReasonToastTitle,
		emptyReasonToastDetail,
		runDestructive
	}: DialogSlotProps & {
		confirmLabel: string;
		textareaAriaLabel: string;
		emptyReasonToastTitle: string;
		emptyReasonToastDetail: string;
		runDestructive: (reason: string) => Promise<void>;
	} = $props();

	const toast = new ToastService();

	let reason = $state('');
	let submitting = $state(false);

	async function handleConfirm() {
		const r = reason.trim();
		if (!r) {
			toast.addToast(
				emptyReasonToastTitle,
				StatusColorEnum.ERROR,
				emptyReasonToastDetail
			);
			return;
		}
		submitting = true;
		try {
			await runDestructive(r);
			confirm();
		} finally {
			submitting = false;
		}
	}
</script>

<textarea
	class="textarea-bordered textarea mt-4 w-full"
	rows="3"
	bind:value={reason}
	aria-label={textareaAriaLabel}
></textarea>
<div class="modal-action mt-4">
	<WashButton
		type="button"
		className="btn"
		disabled={submitting}
		onClick={() => cancel()}
	>
		{m.cancel()}
	</WashButton>
	<WashButton
		type="button"
		className="btn btn-error"
		disabled={submitting}
		onClick={() => void handleConfirm()}
	>
		{confirmLabel}
	</WashButton>
</div>
