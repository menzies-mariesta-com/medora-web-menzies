<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { DeleteStaffConfirmState } from '$lib/state/delete-staff-confirm.state.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	const pending = $derived(DeleteStaffConfirmState.pending);
	let typedEmail = $state('');

	const email = $derived(pending?.email ?? '');
	const staffId = $derived(pending?.id ?? '');
	const isMatch = $derived(typedEmail.trim() === email);

	function handleConfirm() {
		if (isMatch && staffId) confirm(staffId);
	}
</script>

<div class="flex flex-col">
	<div
		class="flex items-center justify-between border-b border-base-300 pb-4"
	>
		<h2 class="text-lg font-semibold">Delete staff</h2>
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
				To confirm deletion, type the staff email
				<strong class="text-primary"> {email} </strong>
				below.
			</p>
			<DaisyUiInputField
				className="d-input-sm w-full"
				inputPlaceholderText="Type the staff email"
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
			<p class="opacity-70">No staff selected.</p>
			<div class="d-modal-action mt-4">
				<DaisyUiButton className="d-btn" onClick={() => cancel()}
					>Cancel</DaisyUiButton
				>
			</div>
		{/if}
	</div>
</div>
