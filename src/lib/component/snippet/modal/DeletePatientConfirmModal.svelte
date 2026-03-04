<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { DeletePatientConfirmState } from '$lib/state/delete-patient-confirm.state.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import LucideX from '$lib/component/library/lucide/LucideX.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	const pending = $derived(DeletePatientConfirmState.pending);
	let typedEmail = $state('');

	const email = $derived(pending?.email ?? '');
	const patientId = $derived(pending?.id ?? '');
	const isMatch = $derived(typedEmail.trim() === email);

	function handleConfirm() {
		if (isMatch && patientId) confirm(patientId);
	}
</script>

<div class="flex flex-col">
	<div
		class="flex items-center justify-between border-b border-base-300 pb-4"
	>
		<h2 class="text-lg font-semibold">Delete patient</h2>
		<DaisyUiButton
			className="d-btn-ghost d-btn-sm d-btn-circle"
			onClick={() => cancel()}
		>
			<LucideX className="size-5" />
		</DaisyUiButton>
	</div>
	<div class="mt-4">
		{#if pending}
			<p class="mb-3 text-sm opacity-90">
				To confirm deletion, type the patient email
				<strong class="text-primary"> {email} </strong>
				below.
			</p>
			<DaisyUiInputField
				className="d-input-sm w-full"
				inputPlaceholderText="Type the patient email"
				bind:value={typedEmail}
			/>
			<div class="d-modal-action mt-4">
				<DaisyUiButton className="d-btn" onClick={() => cancel()}>
					Cancel
				</DaisyUiButton>
				<DaisyUiButton
					className="d-btn d-btn-error"
					disabled={!isMatch}
					onClick={handleConfirm}
				>
					Delete
				</DaisyUiButton>
			</div>
		{:else}
			<p class="opacity-70">No patient selected.</p>
			<div class="d-modal-action mt-4">
				<DaisyUiButton className="d-btn" onClick={() => cancel()}
					>Cancel</DaisyUiButton
				>
			</div>
		{/if}
	</div>
</div>
