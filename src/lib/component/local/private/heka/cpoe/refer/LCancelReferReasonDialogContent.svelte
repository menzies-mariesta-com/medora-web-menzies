<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();

	let cancelReason = $state('');

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = cancelReason.trim();
		if (!trimmed) {
			toastService.addToast(
				'Cancel reason is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		confirm({ cancelReason: trimmed });
	}

	function handleCancelClick() {
		cancel();
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
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
		<DaisyUiButton type="button" className="d-btn-ghost" onClick={handleCancelClick}>
			Cancel
		</DaisyUiButton>
		<DaisyUiButton type="submit" className="d-btn-primary">
			Confirm Cancel
		</DaisyUiButton>
	</div>
</form>

