<script lang="ts">
	import type { Snippet } from 'svelte';
	let { className, children } = $props<{
		className?: string;
		children?: Snippet;
	}>();
</script>

<footer class="footer {className}">
	{#if children}
		{@render children()}
	{/if}
</footer>
