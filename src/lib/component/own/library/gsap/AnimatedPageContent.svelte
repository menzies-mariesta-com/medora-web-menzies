<script lang="ts">
	import type { Snippet } from 'svelte';
	import { gsapAnimate } from '$lib/action/gsap.action.svelte';

	let { children, type = 'fadeUp' } = $props<{
		children?: Snippet;
		type?: 'fade' | 'fadeUp' | 'scale' | 'stagger';
	}>();
</script>

<div use:gsapAnimate={{ type }} class="animate-page-content">
	{#if children}
		{@render children()}
	{/if}
</div>
