<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationDiagnosisDeleteConfirmDialogState } from '$lib/state/observation-diagnosis-delete-confirm-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();
	let { confirm, cancel }: DialogSlotProps = $props();

	const expectedDescription = $derived(
		ObservationDiagnosisDeleteConfirmDialogState.expectedDescription
	);
	let typedDescription = $state('');

	let isConfirming = $state(false);

	function handleCancel() {
		if (isConfirming) return;
		ObservationDiagnosisDeleteConfirmDialogState.expectedDescription =
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
		ObservationDiagnosisDeleteConfirmDialogState.expectedDescription =
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
		Retype the diagnosis description below to inactivate this
		diagnosis.
	</p>
	<p class="rounded bg-base-200 p-2 text-sm font-medium">
		{expectedDescription}
	</p>
	<div class="flex flex-col gap-1">
		<label for="confirm-diagnosis-description">
			{m.observation_emr_instruction()}
		</label>
		<WashInputField
			id="confirm-diagnosis-description"
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
			Inactivate
		</WashButton>
	</div>
</div>
