<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationDiagnosisDeleteConfirmDialogState } from '$lib/state/observation-diagnosis-delete-confirm-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();
	let { confirm, cancel }: DialogSlotProps = $props();

	const expectedDescription = $derived(
		ObservationDiagnosisDeleteConfirmDialogState.expectedDescription
	);
	let typedDescription = $state('');

	function handleCancel() {
		ObservationDiagnosisDeleteConfirmDialogState.expectedDescription =
			null;
		cancel();
	}

	function handleConfirmDelete() {
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
		confirm({ confirmed: true });
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
		<DaisyUiLabel forText="confirm-diagnosis-description">
			{m.observation_emr_instruction()}
		</DaisyUiLabel>
		<DaisyUiInputField
			id="confirm-diagnosis-description"
			className="w-full"
			inputPlaceholderText="Type exact description"
			bind:value={typedDescription}
		/>
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		<DaisyUiButton
			type="button"
			className="d-btn-ghost"
			onClick={handleCancel}
		>
			{m.observation_emr_cancel()}
		</DaisyUiButton>
		<DaisyUiButton
			type="button"
			className="d-btn d-btn-error"
			onClick={handleConfirmDelete}
		>
			Inactivate
		</DaisyUiButton>
	</div>
</div>
