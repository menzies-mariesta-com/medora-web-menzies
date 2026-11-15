<script lang="ts">
	import type { Snippet } from 'svelte';
	let { className, children } = $props<{
		className?: string;
		children?: Snippet;
	}>();
</script>

<span class="indicator-item {className}">
	{#if children}
		{@render children()}
	{/if}
</span>
