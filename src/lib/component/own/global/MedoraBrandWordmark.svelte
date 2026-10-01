<script lang="ts">
	import medoraLogo from '$lib/asset/image/medora-logo.svg';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';

	let {
		href = WebRoutesEnum.DEFAULT,
		className = '',
		asLink = true,
		showLabel = true
	}: {
		href?: string;
		className?: string;
		asLink?: boolean;
		/** When false, logo only (favicon-style mark). */
		showLabel?: boolean;
	} = $props();

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
		src={medoraLogo}
		alt=""
		width="32"
		height="32"
		class="size-8 shrink-0 rounded-[22%]"
		decoding="async"
	/>
	{#if showLabel}
		<span>{m.menzies_medora()}</span>
	{/if}
{/snippet}

{#if asLink}
	<a
		class={`${shellClass} ${className}`.trim()}
		{href}
		aria-label={m.menzies_medora()}
	>
		{@render brandMark()}
	</a>
{:else}
	<span
		class={`${shellClass} ${className}`.trim()}
		role="img"
		aria-label={m.menzies_medora()}
	>
		{@render brandMark()}
	</span>
{/if}
