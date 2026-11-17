<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, className } = $props<{
		children?: Snippet;
		className?: string;
	}>();
</script>

<div class="card-actions justify-end {className}">
	{#if children}
		{@render children()}
	{/if}
</div>
