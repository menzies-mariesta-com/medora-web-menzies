<script lang="ts">
	import { tick } from 'svelte';

	let { groupName, className, open = true, onClose, children } = $props<{
		groupName: string;
		className?: string;
		open?: boolean;
		onClose?: () => void;
		children: () => void;
	}>();

	let dialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (open && dialogEl) {
			tick().then(() => dialogEl?.showModal());
		}
	});

	function handleClose() {
		onClose?.();
	}
</script>

<dialog
	bind:this={dialogEl}
	id="{groupName}"
	class="d-modal {className}"
	onclose={handleClose}
>
	{@render children()}
	<form method="dialog" class="d-modal-backdrop">
		<button type="submit" aria-label="Close">close</button>
	</form>
</dialog>

<!-- 
<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { dialogService } from '$lib/service/dialog.service.svelte';

	let name = $state('');

	function handleConfirm() {
		dialogService.confirmDialog(
			'Are you sure?',
			'Confirm',
			() => console.log('confirmed'),
			() => console.log('cancelled')
		);
	}

	async function handleCustomForm() {
		name = '';
		const result = await dialogService.open({
			title: 'Custom form',
			children: customFormSnippet
		});
		if (result.confirmed) {
			console.log('Got data:', result.data);
		} else {
			console.log('Cancelled');
		}
	}
</script>

{#snippet customFormSnippet({ confirm, cancel }: DialogSlotProps)}
	<input bind:value={name} type="text" placeholder="Your name" />
	<div class="d-modal-action">
		<button type="button" class="d-btn" onclick={() => cancel()}>Cancel</button>
		<button
			type="button"
			class="d-btn d-btn-primary"
			onclick={() => confirm(name)}>
			OK
		</button>
	</div>
{/snippet}

<button onclick={handleConfirm}>Confirm (callback)</button>
<button onclick={() => dialogService.alert('Hello!')}>Alert</button>
<button onclick={handleCustomForm}>Open custom form (get data via promise)</button>
 -->