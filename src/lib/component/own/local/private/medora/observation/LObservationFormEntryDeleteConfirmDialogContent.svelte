<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationFormEntryDeleteConfirmDialogState } from '$lib/state/observation-form-entry-delete-confirm-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();
	let { confirm, cancel }: DialogSlotProps = $props();

	const expectedDescription = $derived(
		ObservationFormEntryDeleteConfirmDialogState.expectedDescription
	);
	let typedDescription = $state('');

	let isConfirming = $state(false);

	function handleCancel() {
		if (isConfirming) return;
		ObservationFormEntryDeleteConfirmDialogState.expectedDescription =
			null;
		cancel();
	}

	async function handleConfirmDelete() {
		if (isConfirming) return;
		const expected = (expectedDescription ?? '').trim();
		const typed = typedDescription.trim();
		if (!expected || typed !== expected) {
			toastService.addToast(
				'Description does not match.',
				StatusColorEnum.ERROR
			);
			return;
		}
		ObservationFormEntryDeleteConfirmDialogState.expectedDescription =
			null;
		isConfirming = true;
		try {
			await confirm({ confirmed: true });
		} finally {
			isConfirming = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<p class="text-sm text-base-content/80">
		{m.observation_emr_form_entry_inactivate_hint()}
	</p>
	<p class="rounded bg-base-200 p-2 text-sm font-medium">
		{expectedDescription}
	</p>
	<div class="flex flex-col gap-1">
		<label for="confirm-form-entry-description">
			{m.observation_emr_instruction()}
		</label>
		<WashInputField
			id="confirm-form-entry-description"
			className="w-full"
			inputPlaceholderText="Type exact description"
			bind:value={typedDescription}
		/>
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		<WashButton
			type="button"
			className="btn-ghost"
			onClick={handleCancel}
			disabled={isConfirming}
		>
			{m.observation_emr_cancel()}
		</WashButton>
		<WashButton
			type="button"
			className="btn btn-error"
			onClick={handleConfirmDelete}
			disabled={isConfirming}
			loading={isConfirming}
		>
			{m.observation_emr_inactivate_confirm()}
		</WashButton>
	</div>
</div>
