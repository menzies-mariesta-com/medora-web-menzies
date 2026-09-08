<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';

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
		<label for="cancel-reason" class="shrink-0 sm:w-36">
			Cancel Reason <span class="text-error">*</span>
		</label>
		<div class="min-w-0 flex-1">
			<WashTextarea
				id="cancel-reason"
				bind:value={cancelReason}
				placeholder="Enter reason for cancelling the referral"
				className="w-full"
			/>
		</div>
	</div>

	<div class="flex flex-wrap justify-end gap-2">
		<WashButton
			type="button"
			className="btn-ghost"
			onClick={handleCancelClick}
			disabled={isSubmitting}
		>
			Cancel
		</WashButton>
		<WashButton
			type="submit"
			className="btn-primary"
			loading={isSubmitting}
		>
			Confirm Cancel
		</WashButton>
	</div>
</form>
