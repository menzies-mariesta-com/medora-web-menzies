<script lang="ts">
	import type { Snippet } from 'svelte';
	let { className, children } = $props<{
		className?: string;
		children?: Snippet;
	}>();
</script>

<ul class="list rounded-box shadow-md {className}">
	{#if children}
		{@render children()}
	{/if}
</ul>
