<script lang="ts">
	import type { Snippet } from 'svelte';
	let { className, children } = $props<{
		className?: string;
		children?: Snippet;
	}>();
</script>

<div class="tabs-lift tabs {className}">
	{#if children}
		{@render children()}
	{/if}
</div>
