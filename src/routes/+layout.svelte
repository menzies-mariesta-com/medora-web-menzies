<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiModalBox from '$lib/component/daisyui/modal/box/DaisyUiModalBox.svelte';
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiToast from '$lib/component/daisyui/toast/DaisyUiToast.svelte';
	import { gsapAnimate } from '$lib/action/gsap.action.svelte';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogState } from '$lib/state/dialog.state.svelte';
	import { ToastState } from '$lib/state/toast.state.svelte';
	import { dismissToast } from '$lib/service/toast.service.svelte';
	import './layout.css';
	import GQuickTool from '$lib/component/own/global/GQuickTool.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ThemeTool } from '$lib/tool/theme.tool.svelte';
	import { LocalStorageUtil } from '$lib/util/local-storage.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import { FontTool } from '$lib/tool/font.tool.svelte';

	let { children } = $props();

	const lifeCycleUtil = new LifeCycleUtil();

	// loading data
	const localStorageUtil = new LocalStorageUtil();
	const themeTool = new ThemeTool(localStorageUtil);
	const fontTool = new FontTool(localStorageUtil);

	const isEmbed = $derived(
		page.url.searchParams.get('embed') === '1'
	);

	/** Dynamic paths from Paraglide are `string`; widen for `resolve` typing. */
	const resolvePathname = resolve as (pathname: string) => string;

	lifeCycleUtil.onMount(() => {
		// set data
		themeTool.getTheme();
		fontTool.getFont();
	});
</script>

<!-- Head -->
<svelte:head>
	<title>
		{m.heka()}
	</title>
	<link rel="icon" type="image/x-icon" href={HekaLogo} />
</svelte:head>

<!-- Root Body -->
{@render children()}

<!-- Floating Action Button -->
{#if !isEmbed}
	<GQuickTool />
{/if}

<!-- Toast Component when no dialog is open (Learn Toast Service To Use) -->
{#if ToastState.length > 0 && !DialogState.current}
	<DaisyUiToast className="d-toast-top d-toast-end z-[9998]">
		{#each ToastState as toast (toast.id)}
			<div
				class="w-full max-w-[min(100vw-2rem,36rem)]"
				use:gsapAnimate={{ type: 'fadeUp', duration: 0.25 }}
			>
				<DaisyUiAlert
					type={toast.type}
					message={toast.message}
					detail={toast.detail}
					showToastActions
					onDismissToast={() => dismissToast(toast.id)}
				/>
			</div>
		{/each}
	</DaisyUiToast>
{/if}

<!-- Dialog component (Learn Dialog service to use) -->
{#if DialogState.current}
	{#if DialogState.current.fullScreen}
		<DaisyUiModal
			groupName="dialog-modal"
			open={true}
			onClose={() => dialogService.cancel()}
			className="!max-w-none !w-[100dvw] !h-[100dvh] !min-h-[100dvh]"
		>
			<div
				class="d-modal-box flex h-[96dvh] min-h-[96dvh] w-[96vw] !max-w-none flex-col gap-0 overflow-hidden p-0"
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
				<DaisyUiToast className="d-toast-top d-toast-end z-[9999]">
					{#each ToastState as toast (toast.id)}
						<div
							class="w-full max-w-[min(100vw-2rem,36rem)]"
							use:gsapAnimate={{ type: 'fadeUp', duration: 0.25 }}
						>
							<DaisyUiAlert
								type={toast.type}
								message={toast.message}
								detail={toast.detail}
								showToastActions
								onDismissToast={() => dismissToast(toast.id)}
							/>
						</div>
					{/each}
				</DaisyUiToast>
			{/if}
		</DaisyUiModal>
	{:else}
		<DaisyUiModal
			groupName="dialog-modal"
			open={true}
			onClose={() => dialogService.cancel()}
		>
			{#if ToastState.length > 0}
				<DaisyUiToast className="d-toast-top d-toast-end z-[9999]">
					{#each ToastState as toast (toast.id)}
						<div
							class="w-full max-w-[min(100vw-2rem,36rem)]"
							use:gsapAnimate={{ type: 'fadeUp', duration: 0.25 }}
						>
							<DaisyUiAlert
								type={toast.type}
								message={toast.message}
								detail={toast.detail}
								showToastActions
								onDismissToast={() => dismissToast(toast.id)}
							/>
						</div>
					{/each}
				</DaisyUiToast>
			{/if}
			<DaisyUiModalBox
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
					<div class="d-modal-action">
						{#if DialogState.current.variant === DialogVariantEnum.CONFIRM}
							<button
								type="button"
								class="d-btn"
								disabled={DialogState.current.confirmPending}
								onclick={() => dialogService.cancel()}
							>
								{m.cancel()}
							</button>
							<button
								type="button"
								class="d-btn d-btn-primary"
								disabled={DialogState.current.confirmPending}
								onclick={() => dialogService.confirm()}
							>
								{#if DialogState.current.confirmPending}
									<span class="inline-flex items-center gap-2">
										<DaisyUiLoading className="d-loading-sm" />
										Loading…
									</span>
								{:else}
									{m.ok()}
								{/if}
							</button>
						{:else}
							<button
								type="button"
								class="d-btn d-btn-primary"
								onclick={() => dialogService.close()}
							>
								{m.ok()}
							</button>
						{/if}
					</div>
				{/if}
			</DaisyUiModalBox>
		</DaisyUiModal>
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
