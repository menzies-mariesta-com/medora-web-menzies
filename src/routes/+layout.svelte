<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashModalBox from '$lib/component/wash/modal/box/WashModalBox.svelte';
	import WashModal from '$lib/component/wash/modal/WashModal.svelte';
	import WashToast from '$lib/component/wash/toast/WashToast.svelte';
	import { gsapAnimate } from '$lib/action/gsap.action.svelte';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogState } from '$lib/state/dialog.state.svelte';
	import { ToastState } from '$lib/state/toast.state.svelte';
	import { dismissToast } from '$lib/service/toast.service.svelte';
	/* Wash base first; app Tailwind/Daisy utilities must load after so
	   responsive variants (sm:flex-row, lg:grid-cols-*, …) override Wash’s
	   unprefixed .flex-col / .grid-cols-* and restore original layouts. */
	import '@menzies-mariesta-com/menzies-design-wash-ui/styles.css';
	import './layout.css';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import GQuickTool from '$lib/component/own/global/GQuickTool.svelte';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { WashThemeTool } from '$lib/tool/wash-theme.tool.svelte';
	import { WashThemeState } from '$lib/state/wash-theme.state.svelte';

	let { children } = $props();

	const lifeCycleUtil = new LifeCycleUtil();
	const washThemeTool = new WashThemeTool();

	const isEmbed = $derived(
		page.url.searchParams.get('embed') === '1'
	);

	/** Dynamic paths from Paraglide are `string`; widen for `resolve` typing. */
	const resolvePathname = resolve as (pathname: string) => string;

	const faviconSvg = `data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#276C8E"/><text x="32" y="40" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#fff">MM</text></svg>`
	)}`;

	lifeCycleUtil.onMount(() => {
		washThemeTool.boot();
		WashThemeState.pigment = washThemeTool.getPigment();
		WashThemeState.mode = washThemeTool.getMode();
	});
	lifeCycleUtil.onDestroy(() => {
		washThemeTool.destroy();
	});
</script>

<!-- Head -->
<svelte:head>
	<title>
		{m.menzies_medora()}
	</title>
	<link rel="icon" type="image/svg+xml" href={faviconSvg} />
</svelte:head>

<!-- Pure Wash: single shell only — never nest washShell / washPanel / page-wash below. -->
<div class={washRecipes.washShell}>
	{@render children()}
</div>

<!-- Floating Action Button -->
{#if !isEmbed}
	<GQuickTool />
{/if}

<!-- Toast Component when no dialog is open (Learn Toast Service To Use) -->
{#if ToastState.length > 0 && !DialogState.current}
	<WashToast className="toast-top toast-end z-[9998]">
		{#each ToastState as toast (toast.id)}
			<div
				class="w-full max-w-[min(100vw-2rem,36rem)]"
				use:gsapAnimate={{ type: 'fadeUp', duration: 0.25 }}
			>
				<WashAlert
					type={toast.type}
					message={toast.message}
					detail={toast.detail}
					showToastActions
					onDismissToast={() => dismissToast(toast.id)}
				/>
			</div>
		{/each}
	</WashToast>
{/if}

<!-- Dialog component (Learn Dialog service to use) -->
{#if DialogState.current}
	{#if DialogState.current.fullScreen}
		<WashModal
			groupName="dialog-modal"
			open={true}
			onClose={() => dialogService.cancel()}
			className="!max-w-none !w-[100dvw] !h-[100dvh] !min-h-[100dvh]"
		>
			<div
				class="modal-box flex h-[96dvh] min-h-[96dvh] w-[96vw] !max-w-none flex-col gap-0 overflow-hidden p-0"
				role="document"
			>
				{#if DialogState.current.component}
					{@const DialogContent = DialogState.current.component}
					<DialogContent
						{...DialogState.current.props}
						confirm={(data: unknown) => dialogService.confirm(data)}
						cancel={() => dialogService.cancel()}
					/>
				{:else if DialogState.current.children}
					{@render DialogState.current.children({
						confirm: (data: unknown) => dialogService.confirm(data),
						cancel: () => dialogService.cancel()
					})}
				{/if}
			</div>
			<!-- Toasts inside dialog so they appear above attachment/dialog content (top layer) -->
			{#if ToastState.length > 0}
				<WashToast className="toast-top toast-end z-[9999]">
					{#each ToastState as toast (toast.id)}
						<div
							class="w-full max-w-[min(100vw-2rem,36rem)]"
							use:gsapAnimate={{ type: 'fadeUp', duration: 0.25 }}
						>
							<WashAlert
								type={toast.type}
								message={toast.message}
								detail={toast.detail}
								showToastActions
								onDismissToast={() => dismissToast(toast.id)}
							/>
						</div>
					{/each}
				</WashToast>
			{/if}
		</WashModal>
	{:else}
		<WashModal
			groupName="dialog-modal"
			open={true}
			onClose={() => dialogService.cancel()}
		>
			{#if ToastState.length > 0}
				<WashToast className="toast-top toast-end z-[9999]">
					{#each ToastState as toast (toast.id)}
						<div
							class="w-full max-w-[min(100vw-2rem,36rem)]"
							use:gsapAnimate={{ type: 'fadeUp', duration: 0.25 }}
						>
							<WashAlert
								type={toast.type}
								message={toast.message}
								detail={toast.detail}
								showToastActions
								onDismissToast={() => dismissToast(toast.id)}
							/>
						</div>
					{/each}
				</WashToast>
			{/if}
			<WashModalBox
				className={DialogState.current.modalClassName}
				onClose={() => dialogService.cancel()}
				showCloseButton={!DialogState.current.component}
			>
				{#if DialogState.current.component}
					{#if DialogState.current.title}
						<h3 class="mb-5 text-lg font-bold">
							{DialogState.current.title}
						</h3>
					{/if}
					{@const DialogContent = DialogState.current.component}
					<DialogContent
						{...DialogState.current.props}
						confirm={(data: unknown) => dialogService.confirm(data)}
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
					<div class="modal-action">
						{#if DialogState.current.variant === DialogVariantEnum.CONFIRM}
							<button
								type="button"
								class="btn"
								disabled={DialogState.current.confirmPending}
								onclick={() => dialogService.cancel()}
							>
								{m.cancel()}
							</button>
							<button
								type="button"
								class="btn btn-primary"
								disabled={DialogState.current.confirmPending}
								onclick={() => dialogService.confirm()}
							>
								{#if DialogState.current.confirmPending}
									<span class="inline-flex items-center gap-2">
										<span class="loading loading-spinner loading-sm"></span>
										Loading…
									</span>
								{:else}
									{m.ok()}
								{/if}
							</button>
						{:else}
							<button
								type="button"
								class="btn btn-primary"
								onclick={() => dialogService.close()}
							>
								{m.ok()}
							</button>
						{/if}
					</div>
				{/if}
			</WashModalBox>
		</WashModal>
	{/if}
{/if}

<!-- Language -->
<div style="display:none">
	{#each locales as locale (locale)}
		<a
			href={resolvePathname(
				localizeHref(page.url.pathname, { locale })
			)}
		>
			{locale}
		</a>
	{/each}
</div>
