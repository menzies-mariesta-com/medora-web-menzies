<script lang="ts">
	import type { Snippet } from 'svelte';
	let { className, children } = $props<{
		className?: string;
		children?: Snippet;
	}>();
</script>

<summary class="btn {className}">
	{#if children}
		{@render children()}
	{/if}
</summary>
