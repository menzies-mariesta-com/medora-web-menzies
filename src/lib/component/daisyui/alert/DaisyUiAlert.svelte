<script lang="ts">
	import type { Component } from 'svelte';
	import type { Snippet } from 'svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideInfo from '$lib/component/own/library/lucide/LucideInfo.svelte';
	import LucideTriangleAlert from '$lib/component/own/library/lucide/LucideTriangleAlert.svelte';
	import LucideCircleX from '$lib/component/own/library/lucide/LucideCircleX.svelte';
	import LucideCopy from '$lib/component/own/library/lucide/LucideCopy.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import { m } from '$lib/paraglide/messages';

	/** Paraglide `m` typings can lag behind `messages/*.json`; messages exist at runtime. */
	const msg = m as Record<string, (inputs?: object) => string>;

	let {
		type = StatusColorEnum.INFO,
		className = '',
		message = '',
		detail = '',
		trailing = undefined,
		/** When true, show copy + dismiss controls (stack toasts in root layout). */
		showToastActions = false,
		onDismissToast = undefined
	}: {
		type: StatusColorEnum;
		className?: string;
		message: string;
		detail?: string;
		trailing?: Snippet;
		showToastActions?: boolean;
		onDismissToast?: () => void;
	} = $props();

	const typeClassMap: Record<StatusColorEnum, string> = {
		[StatusColorEnum.SUCCESS]: 'd-alert-success',
		[StatusColorEnum.INFO]: 'd-alert-info',
		[StatusColorEnum.WARNING]: 'd-alert-warning',
		[StatusColorEnum.ERROR]: 'd-alert-error'
	};

	const toneClassMap: Record<StatusColorEnum, string> = {
		[StatusColorEnum.SUCCESS]: 'text-success-content',
		[StatusColorEnum.INFO]: 'text-info-content',
		[StatusColorEnum.WARNING]: 'text-warning-content',
		[StatusColorEnum.ERROR]: 'text-error-content'
	};

	const iconMap: Record<StatusColorEnum, Component> = {
		[StatusColorEnum.SUCCESS]: LucideCircleCheck,
		[StatusColorEnum.INFO]: LucideInfo,
		[StatusColorEnum.WARNING]: LucideTriangleAlert,
		[StatusColorEnum.ERROR]: LucideCircleX
	};

	const alertClass = $derived(
		`d-alert ${typeClassMap[type]} ${toneClassMap[type]} ${className ?? ''}`.trim()
	);
	const IconComponent = $derived(iconMap[type]);
	const hasDetail = $derived(Boolean(detail?.trim()));
	const hasTrailing = $derived(Boolean(trailing));

	const copyText = $derived(
		hasDetail && detail?.trim()
			? `${message}\n${detail.trim()}`
			: message
	);

	async function copyToastText() {
		try {
			await navigator.clipboard.writeText(copyText);
		} catch {
			/* clipboard unavailable */
		}
	}
</script>

<div
	role="alert"
	class="{alertClass} flex flex-row items-center gap-3 shadow-lg"
>
	<span class="inline-flex shrink-0 text-[currentColor]" aria-hidden="true">
		<IconComponent className="size-5 text-[currentColor]" />
	</span>
	<div class="min-w-0 flex-1 text-sm leading-snug">
		{#if hasDetail}
			<p class="font-medium">{message}</p>
			<p class="mt-1 text-xs font-normal opacity-[0.92]">{detail?.trim()}</p>
		{:else}
			<p>{message}</p>
		{/if}
	</div>
	{#if hasTrailing}
		<div class="flex shrink-0 items-center">{@render trailing?.()}</div>
	{/if}
	{#if showToastActions}
		<div class="flex shrink-0 items-center gap-0.5">
			<button
				type="button"
				class="d-btn d-btn-ghost d-btn-sm d-btn-square min-h-8 min-w-8 border-0 text-current hover:bg-current/10"
				aria-label={msg.toast_copy_message_aria()}
				onclick={copyToastText}
			>
				<LucideCopy className="size-4" />
			</button>
			<button
				type="button"
				class="d-btn d-btn-ghost d-btn-sm d-btn-square min-h-8 min-w-8 border-0 text-current hover:bg-current/10"
				aria-label={msg.toast_dismiss_aria()}
				onclick={() => onDismissToast?.()}
			>
				<LucideX className="size-4" />
			</button>
		</div>
	{/if}
</div>
