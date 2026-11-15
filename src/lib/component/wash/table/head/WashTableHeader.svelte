<script lang="ts">
	import type { Snippet } from 'svelte';
	let { className, children } = $props<{
		className?: string;
		children?: Snippet;
	}>();
</script>

<!-- head -->
<thead class={className}>
	{#if children}
		{@render children()}
	{/if}
</thead>
