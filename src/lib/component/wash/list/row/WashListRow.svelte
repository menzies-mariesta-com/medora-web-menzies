<script lang="ts">
	import type { Snippet } from 'svelte';
	let { className, children } = $props<{
		className?: string;
		children?: Snippet;
	}>();
</script>

<li class="list-row {className}">
	{#if children}
		{@render children()}
	{/if}
</li>
