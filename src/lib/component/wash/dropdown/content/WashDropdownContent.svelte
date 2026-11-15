<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, className } = $props<{
		className?: string;
		children?: Snippet;
	}>();
</script>

<ul
	class="dropdown-content menu z-1 w-52 rounded-box p-2 shadow-sm {className}"
>
	{#if children}
		{@render children()}
	{/if}
</ul>
