<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { DeactivationRemarkDialogState } from '$lib/state/deactivation-remark-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const message = $derived(DeactivationRemarkDialogState.message);

	let deactivationRemark = $state('');

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = deactivationRemark.trim();
		if (!trimmed) {
			toastService.addToast(
				'Deactivation remark is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		DeactivationRemarkDialogState.message = null;
		confirm({ deactivationRemark: trimmed });
	}

	function handleCancel() {
		DeactivationRemarkDialogState.message = null;
		cancel();
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	{#if message}
		<p class="text-base-content/80">{message}</p>
	{/if}
	<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
		<DaisyUiLabel forText="deactivation-remark-dialog" className="shrink-0 sm:w-36">
			Deactivation remark <span class="text-error">*</span>
		</DaisyUiLabel>
		<div class="min-w-0 flex-1">
			<DaisyUiTextarea
				id="deactivation-remark-dialog"
				bind:value={deactivationRemark}
				placeholder="Reason for inactivating these allergies"
				className="w-full"
			/>
		</div>
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		<DaisyUiButton type="button" className="d-btn-ghost" onClick={handleCancel}>
			Cancel
		</DaisyUiButton>
		<DaisyUiButton type="submit" className="d-btn-primary">
			Continue
		</DaisyUiButton>
	</div>
</form>
