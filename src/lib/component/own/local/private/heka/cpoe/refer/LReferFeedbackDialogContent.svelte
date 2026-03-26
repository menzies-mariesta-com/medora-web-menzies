<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';

	interface Props extends DialogSlotProps {
		label: string;
		placeholder?: string;
		confirmLabel?: string;
		required?: boolean;
	}

	let {
		confirm,
		cancel,
		label,
		placeholder = 'Enter details...',
		confirmLabel = 'Confirm',
		required = false
	}: Props = $props();

	const toastService = new ToastService();

	let note = $state('');

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = note.trim();
		if (required && !trimmed) {
			toastService.addToast(
				`${label} is required.`,
				StatusColorEnum.ERROR
			);
			return;
		}
		confirm({ note: trimmed || null });
	}

	function handleCancelClick() {
		cancel();
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-6">
	<div
		class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
	>
		<DaisyUiLabel forText="refer-note" className="shrink-0 sm:w-32">
			{label}
			{#if required}<span class="text-error">*</span>{/if}
		</DaisyUiLabel>
		<div class="min-w-0 flex-1">
			<DaisyUiTextarea
				id="refer-note"
				bind:value={note}
				{placeholder}
				className="w-full"
			/>
		</div>
	</div>

	<div
		class="d-modal-action mt-0 flex justify-end gap-2 border-t border-base-300 pt-4"
	>
		<DaisyUiButton
			type="button"
			className="d-btn-ghost"
			onClick={handleCancelClick}
		>
			Cancel
		</DaisyUiButton>
		<DaisyUiButton type="submit" className="d-btn-primary">
			{confirmLabel}
		</DaisyUiButton>
	</div>
</form>
