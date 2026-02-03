<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiModalBox from '$lib/component/library/daisyui/modal/box/DaisyUiModalBox.svelte';
	import DaisyUiModal from '$lib/component/library/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiToast from '$lib/component/library/daisyui/toast/DaisyUiToast.svelte';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogState } from '$lib/state/dialog.state.svelte';
	import { ToastState } from '$lib/state/toast.state.svelte';
	import './layout.css';
	import GQuickTool from '$lib/component/global/GQuickTool.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ThemeTool } from '$lib/tool/theme.tool.svelte';
	import { LocalStorageUtil } from '$lib/util/local-storage.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	let { children } = $props();

	const lifeCycleUtil = new LifeCycleUtil();

	// loading data
	const localStorageUtil = new LocalStorageUtil();
	const themeTool = new ThemeTool(localStorageUtil);

	lifeCycleUtil.onMount(() => {
		// set data
		themeTool.getTheme();
	});
</script>

<!-- Head -->
<svelte:head>
	<title>
		{m.heka()}
	</title>
</svelte:head>

<!-- Root Body -->
{@render children()}

<!-- Floating Action Button -->
<GQuickTool />

<!-- Toast Component (Learn Toast Service To Use) -->
{#if ToastState.length > 0}
	<DaisyUiToast className="d-toast-bottom d-toast-end">
		{#each ToastState as toast (toast.id)}
			<DaisyUiAlert type={toast.type} message={toast.message} />
		{/each}
	</DaisyUiToast>
{/if}

<!-- Dialog component (Learn Dialog service to use) -->
{#if DialogState.current}
	<DaisyUiModal
		groupName="dialog-modal"
		open={true}
		onClose={() => dialogService.close()}
	>
		<DaisyUiModalBox onClose={() => dialogService.close()}>
			{#if DialogState.current.component}
				{#if DialogState.current.title}
					<h3 class="mb-5 text-lg font-bold">
						{DialogState.current.title}
					</h3>
				{/if}
				{@const DialogContent = DialogState.current.component}
				<DialogContent
					confirm={(data) => dialogService.confirm(data)}
					cancel={() => dialogService.cancel()}
				/>
			{:else if DialogState.current.children}
				{#if DialogState.current.title}
					<h3 class="text-lg font-bold">
						{DialogState.current.title}
					</h3>
				{/if}
				{@render DialogState.current.children({
					confirm: (data) => dialogService.confirm(data),
					cancel: () => dialogService.cancel()
				})}
			{:else}
				{#if DialogState.current.title}
					<h3 class="text-lg font-bold">
						{DialogState.current.title}
					</h3>
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

<!-- Language -->
<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>
			{locale}
		</a>
	{/each}
</div>
