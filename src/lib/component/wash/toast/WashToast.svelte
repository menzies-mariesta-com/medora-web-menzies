<script lang="ts">
	import type { Snippet } from 'svelte';
	let { className, children } = $props<{
		className?: string;
		children?: Snippet;
	}>();
</script>

<div class="toast toast-center {className}">
	{#if children}
		{@render children()}
	{/if}
</div>
