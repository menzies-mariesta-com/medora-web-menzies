<script lang="ts">
	import medoraLogo from '$lib/asset/image/medora-logo.svg';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';

	let {
		href = WebRoutesEnum.DEFAULT,
		className = '',
		asLink = true,
		showLabel = true,
		/** Override wordmark text (e.g. hospital name). Falls back to Medora. */
		brandName = null,
		/** Override logo image src. Falls back to Medora mark. */
		logoSrc = null
	}: {
		href?: string;
		className?: string;
		asLink?: boolean;
		/** When false, logo only (favicon-style mark). */
		showLabel?: boolean;
		brandName?: string | null;
		logoSrc?: string | null;
	} = $props();

	const displayName = $derived(
		brandName?.trim() || m.menzies_medora()
	);
	const displayLogoSrc = $derived(logoSrc?.trim() || medoraLogo);
	const shellClass = $derived(
		[
			'inline-flex items-center gap-2',
			'font-[family-name:var(--font-display)] text-primary text-lg font-semibold tracking-tight',
			'whitespace-nowrap',
			asLink ? 'cursor-pointer' : 'cursor-default'
		].join(' ')
	);
</script>

{#snippet brandMark()}
	<img
		src={displayLogoSrc}
		alt=""
		width="32"
		height="32"
		class="size-8 shrink-0 rounded-[22%] object-cover"
		decoding="async"
	/>
	{#if showLabel}
		<span class="max-w-[12rem] truncate sm:max-w-[16rem] md:max-w-[20rem]"
			>{displayName}</span
		>
	{/if}
{/snippet}

{#if asLink}
	<a
		class={`${shellClass} ${className}`.trim()}
		{href}
		aria-label={displayName}
	>
		{@render brandMark()}
	</a>
{:else}
	<span
		class={`${shellClass} ${className}`.trim()}
		role="img"
		aria-label={displayName}
	>
		{@render brandMark()}
	</span>
{/if}
