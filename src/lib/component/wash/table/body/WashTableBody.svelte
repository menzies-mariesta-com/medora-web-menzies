<script lang="ts">
	import type { Snippet } from 'svelte';
	let { className, children } = $props<{
		className?: string;
		children?: Snippet;
	}>();
</script>

<tbody class={className}>
	{#if children}
		{@render children()}
	{/if}
</tbody>
