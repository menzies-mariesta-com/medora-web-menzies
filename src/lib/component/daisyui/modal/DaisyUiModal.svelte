<script lang="ts">
	import { tick } from 'svelte';
	import gsap from 'gsap';

	let {
		groupName,
		className,
		open = true,
		onClose,
		children
	} = $props<{
		groupName: string;
		className?: string;
		open?: boolean;
		onClose?: () => void;
		children: () => void;
	}>();

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let contentEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (open && dialogEl) {
			tick().then(() => dialogEl?.showModal());
		}
	});

	$effect(() => {
		if (!open && dialogEl) {
			dialogEl.close();
		}
	});

	$effect(() => {
		if (open && contentEl) {
			const target =
				contentEl.querySelector('.d-modal-box') ??
				contentEl.firstElementChild ??
				contentEl;
			gsap.fromTo(
				target,
				{ opacity: 0, scale: 0.96 },
				{
					opacity: 1,
					scale: 1,
					duration: 0.25,
					ease: 'power2.out'
				}
			);
		}
	});

	function handleClose() {
		onClose?.();
	}
</script>

<dialog
	bind:this={dialogEl}
	id={groupName}
	class="d-modal {className}"
	onclose={handleClose}
>
	<div bind:this={contentEl} class="d-modal-content-wrapper">
		{@render children()}
	</div>
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
