<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { DeleteStaffConfirmState } from '$lib/state/delete-staff-confirm.state.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
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
		<WashButton
			className="btn-ghost btn-sm btn-circle"
			onClick={() => cancel()}
		>
			<LucideX className="size-5" />
		</WashButton>
	</div>
	<div class="mt-4">
		{#if pending}
			<p class="mb-3 text-sm opacity-90">
				To confirm deletion, type the staff email
				<strong class="text-primary"> {email} </strong>
				below.
			</p>
			<WashInputField
				className="input-sm w-full"
				inputPlaceholderText="Type the staff email"
				bind:value={typedEmail}
			/>
			<div class="modal-action mt-4">
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
			</div>
		{:else}
			<p class="opacity-70">No staff selected.</p>
			<div class="modal-action mt-4">
				<WashButton className="btn" onClick={() => cancel()}
					>Cancel</WashButton
				>
			</div>
		{/if}
	</div>
</div>
