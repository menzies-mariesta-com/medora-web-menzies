<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
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
	class="d-textarea-bordered d-textarea mt-4 w-full"
	rows="3"
	bind:value={reason}
	aria-label={textareaAriaLabel}
></textarea>
<div class="d-modal-action mt-4">
	<DaisyUiButton type="button" className="d-btn" disabled={submitting} onClick={() => cancel()}>
		{m.cancel()}
	</DaisyUiButton>
	<DaisyUiButton
		type="button"
		className="d-btn d-btn-error"
		disabled={submitting}
		onClick={() => void handleConfirm()}
	>
		{confirmLabel}
	</DaisyUiButton>
</div>
