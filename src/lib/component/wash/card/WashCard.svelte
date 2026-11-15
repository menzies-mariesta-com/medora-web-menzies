<script lang="ts">
	import type { Snippet } from 'svelte';
	import { gsapAnimate } from '$lib/action/gsap.action.svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	let {
		children,
		className,
		animate = false
	} = $props<{
		children?: Snippet;
		className?: string;
		/** When true, card fades in smoothly on mount */
		animate?: boolean;
	}>();
</script>

<div
	class="card shadow-md {washRecipes.washPanel} {className}"
	use:gsapAnimate={animate
		? { type: 'fadeUp', duration: 0.3, enabled: true }
		: false}
>
	{#if children}
		{@render children()}
	{/if}
</div>
