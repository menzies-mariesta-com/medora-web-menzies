<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashToast from '$lib/component/wash/toast/WashToast.svelte';
	import { gsapAnimate } from '$lib/action/gsap.action.svelte';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import type { DialogTone } from '$lib/model/interface/dialog.interface';
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

	const dialogTone = $derived.by((): DialogTone => {
		const current = DialogState.current;
		if (!current) return 'primary';
		if (current.tone) return current.tone;
		return 'primary';
	});

	const dialogDescription = $derived(
		DialogState.current?.description ??
			(DialogState.current &&
			!DialogState.current.component &&
			!DialogState.current.children
				? DialogState.current.message
				: undefined)
	);

	const dialogOwnsActions = $derived(
		Boolean(
			DialogState.current?.component || DialogState.current?.children
		)
	);
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

<!-- Dialog component (Learn Dialog service to use) — Menzies Design Dialog -->
{#if DialogState.current}
	<WashDialog
		id="dialog-modal"
		open={true}
		onClose={() => dialogService.cancel()}
		title={DialogState.current.title}
		description={dialogDescription}
		tone={dialogTone}
		layout={DialogState.current.fullScreen ? 'fullscreen' : 'default'}
		boxClassName={DialogState.current.modalClassName}
		showActions={!dialogOwnsActions}
		showDefaultClose={false}
	>
		{#snippet layer()}
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
		{/snippet}

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

		{#snippet actions()}
			{#if DialogState.current?.variant === DialogVariantEnum.CONFIRM}
				<WashButton
					type="button"
					variant="ghost"
					disabled={DialogState.current.confirmPending}
					onClick={() => dialogService.cancel()}
				>
					{m.cancel()}
				</WashButton>
				<WashButton
					type="button"
					variant="primary"
					disabled={DialogState.current.confirmPending}
					loading={DialogState.current.confirmPending}
					loadingText={m.loading()}
					onClick={() => dialogService.confirm()}
				>
					{m.ok()}
				</WashButton>
			{:else}
				<WashButton
					type="button"
					variant="primary"
					onClick={() => dialogService.close()}
				>
					{m.ok()}
				</WashButton>
			{/if}
		{/snippet}
	</WashDialog>
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
