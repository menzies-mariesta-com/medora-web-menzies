<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { DeletePatientConfirmState } from '$lib/state/delete-patient-confirm.state.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';

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

<div class="flex min-h-0 flex-1 flex-col">
	{#if pending}
		<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
			<p class="mb-3 text-sm opacity-90">
				To confirm deletion, type the patient email
				<strong class="text-primary"> {email} </strong>
				below.
			</p>
			<WashInputField
				className="input-sm w-full"
				inputPlaceholderText="Type the patient email"
				bind:value={typedEmail}
			/>
		</div>
		<WashDialogFooter className="gap-2">
			<WashButton className="btn" onClick={() => cancel()}>
				Cancel
			</WashButton>
			<WashButton
				className="btn btn-error"
				disabled={!isMatch}
				onClick={handleConfirm}
			>
				Delete
			</WashButton>
		</WashDialogFooter>
	{:else}
		<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
			<p class="opacity-70">No patient selected.</p>
		</div>
		<WashDialogFooter>
			<WashButton className="btn" onClick={() => cancel()}
				>Cancel</WashButton
			>
		</WashDialogFooter>
	{/if}
</div>
