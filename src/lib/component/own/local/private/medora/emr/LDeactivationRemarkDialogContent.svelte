<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { DeactivationRemarkDialogState } from '$lib/state/deactivation-remark-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const message = $derived(DeactivationRemarkDialogState.message);

	let deactivationRemark = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isSubmitting) return;
		const trimmed = deactivationRemark.trim();
		if (!trimmed) {
			toastService.addToast(
				'Deactivation remark is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		DeactivationRemarkDialogState.message = null;
		isSubmitting = true;
		try {
			await confirm({ deactivationRemark: trimmed });
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		if (isSubmitting) return;
		DeactivationRemarkDialogState.message = null;
		cancel();
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	{#if message}
		<p class="text-base-content/80">{message}</p>
	{/if}
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
	>
		<label for="deactivation-remark-dialog" class="shrink-0 sm:w-36">
			Deactivation remark <span class="text-error">*</span>
		</label>
		<div class="min-w-0 flex-1">
			<WashTextarea
				id="deactivation-remark-dialog"
				bind:value={deactivationRemark}
				placeholder="Reason for inactivating these allergies"
				className="w-full"
			/>
		</div>
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		<WashButton
			type="button"
			className="btn-ghost"
			onClick={handleCancel}
			disabled={isSubmitting}
		>
			Cancel
		</WashButton>
		<WashButton
			type="submit"
			className="btn-primary"
			loading={isSubmitting}
		>
			Continue
		</WashButton>
	</div>
</form>
