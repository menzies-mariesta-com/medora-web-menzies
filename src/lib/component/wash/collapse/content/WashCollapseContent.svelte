<script lang="ts">
	import type { Snippet } from 'svelte';
	let { className, children } = $props<{
		className?: string;
		children?: Snippet;
	}>();
</script>

<div class="collapse-content text-sm {className}">
	{#if children}
		{@render children()}
	{/if}
</div>
