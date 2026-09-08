<script lang="ts">
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';

	let {
		href = WebRoutesEnum.DEFAULT,
		className = '',
		asLink = true
	}: {
		href?: string;
		className?: string;
		asLink?: boolean;
	} = $props();

	const wordmarkClass =
		'font-[family-name:var(--font-display)] text-primary text-lg font-semibold tracking-tight whitespace-nowrap';
</script>

{#if asLink}
	<a class={`${wordmarkClass} ${className}`.trim()} {href}>
		{m.menzies_medora()}
	</a>
{:else}
	<span class={`${wordmarkClass} ${className}`.trim()}>{m.menzies_medora()}</span>
{/if}
