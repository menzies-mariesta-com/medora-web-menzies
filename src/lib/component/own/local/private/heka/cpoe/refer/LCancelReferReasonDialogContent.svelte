<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();

	let cancelReason = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isSubmitting) return;
		const trimmed = cancelReason.trim();
		if (!trimmed) {
			toastService.addToast(
				'Cancel reason is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		isSubmitting = true;
		try {
			await confirm({ cancelReason: trimmed });
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancelClick() {
		if (isSubmitting) return;
		cancel();
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
	>
		<DaisyUiLabel
			forText="cancel-reason"
			className="shrink-0 sm:w-36"
		>
			Cancel Reason <span class="text-error">*</span>
		</DaisyUiLabel>
		<div class="min-w-0 flex-1">
			<DaisyUiTextarea
				id="cancel-reason"
				bind:value={cancelReason}
				placeholder="Enter reason for cancelling the referral"
				className="w-full"
			/>
		</div>
	</div>

	<div class="flex flex-wrap justify-end gap-2">
		<DaisyUiButton
			type="button"
			className="d-btn-ghost"
			onClick={handleCancelClick}
			disabled={isSubmitting}
		>
			Cancel
		</DaisyUiButton>
		<DaisyUiButton
			type="submit"
			className="d-btn-primary"
			loading={isSubmitting}
		>
			Confirm Cancel
		</DaisyUiButton>
	</div>
</form>
