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
	/* Wash styles.css is imported in layout.css under @layer components. */
	import './layout.css';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import GQuickTool from '$lib/component/own/global/GQuickTool.svelte';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { FontTool } from '$lib/tool/font.tool.svelte';
	import { WashThemeTool } from '$lib/tool/wash-theme.tool.svelte';
	import { FontState } from '$lib/state/font.state.svelte';
	import { WashThemeState } from '$lib/state/wash-theme.state.svelte';

	let { children } = $props();

	const lifeCycleUtil = new LifeCycleUtil();
	const washThemeTool = new WashThemeTool();
	const fontTool = new FontTool();

	const isEmbed = $derived(
		page.url.searchParams.get('embed') === '1'
	);

	/** FAB only in private medora app; hidden on marketing, auth, onboarding, pricing. */
	const showQuickTool = $derived(
		!isEmbed && page.url.pathname.startsWith('/medora')
	);

	/** Dynamic paths from Paraglide are `string`; widen for `resolve` typing. */
	const resolvePathname = resolve as (pathname: string) => string;

	lifeCycleUtil.onMount(() => {
		washThemeTool.boot();
		fontTool.boot();
		WashThemeState.pigment = washThemeTool.getPigment();
		WashThemeState.mode = washThemeTool.getMode();
		FontState.font = fontTool.getFont();
	});
	lifeCycleUtil.onDestroy(() => {
		fontTool.destroy();
		washThemeTool.destroy();
	});

	const dialogTone = $derived.by((): DialogTone => {
		const current = DialogState.current;
		if (!current) return 'primary';
		if (current.tone) return current.tone;
		return 'primary';
	});

	/** Short subtitle only — confirm/alert copy uses `message` in the body. */
	const dialogDescription = $derived(DialogState.current?.description);

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
	<link rel="icon" type="image/svg+xml" href="/medora-logo.svg" />
	<link rel="apple-touch-icon" href="/medora-logo.svg" />
</svelte:head>

<!-- Pure Wash: single shell only — never nest washShell / washPanel / page-wash below. -->
<div class={washRecipes.washShell}>
	{@render children()}
</div>

<!-- Floating Action Button (private medora only; still hidden when embed=1) -->
{#if showQuickTool}
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
		closeOnOutsideClick={Boolean(DialogState.current.closeOnOutsideClick)}
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
		{:else if DialogState.current.message}
			<p class="text-base-content text-sm leading-relaxed">
				{DialogState.current.message}
			</p>
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
