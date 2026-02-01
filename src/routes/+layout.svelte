<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiModalBox from '$lib/component/library/daisyui/modal/box/DaisyUiModalBox.svelte';
	import DaisyUiModal from '$lib/component/library/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiToast from '$lib/component/library/daisyui/toast/DaisyUiToast.svelte';
	import { m } from '$lib/paraglide/messages';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogState } from '$lib/state/dialog.state.svelte';
	import { ToastState } from '$lib/state/toast.state.svelte';
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>
		{m.heka()}
	</title>
</svelte:head>

<div class="my-web">
	<div class="my-main">
		{@render children()}
	</div>
</div>

{#if ToastState.length > 0}
	<DaisyUiToast className="d-toast-bottom d-toast-end">
		{#each ToastState as toast (toast.id)}
			<DaisyUiAlert type={toast.type} message={toast.message} />
		{/each}
	</DaisyUiToast>
{/if}

{#if DialogState.current}
	<DaisyUiModal
		groupName="dialog-modal"
		open={true}
		onClose={() => dialogService.close()}
	>
		<DaisyUiModalBox onClose={() => dialogService.close()}>
			{#if DialogState.current.children}
				{#if DialogState.current.title}
					<h3 class="d-font-bold d-text-lg">{DialogState.current.title}</h3>
				{/if}
				{@render DialogState.current.children({
					confirm: (data) => dialogService.confirm(data),
					cancel: () => dialogService.cancel()
				})}
			{:else}
				{#if DialogState.current.title}
					<h3 class="d-font-bold d-text-lg">{DialogState.current.title}</h3>
				{/if}
				<p>{DialogState.current.message}</p>
				<div class="d-modal-action">
					{#if DialogState.current.variant === DialogVariantEnum.CONFIRM}
						<button
							type="button"
							class="d-btn"
							onclick={() => dialogService.cancel()}
						>
							Cancel
						</button>
						<button
							type="button"
							class="d-btn d-btn-primary"
							onclick={() => dialogService.confirm()}
						>
							OK
						</button>
					{:else}
						<button
							type="button"
							class="d-btn d-btn-primary"
							onclick={() => dialogService.close()}
						>
							OK
						</button>
					{/if}
				</div>
			{/if}
		</DaisyUiModalBox>
	</DaisyUiModal>
{/if}

<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>
			{locale}
		</a>
	{/each}
</div>
