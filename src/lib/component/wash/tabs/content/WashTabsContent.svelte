<script lang="ts">
	import type { Snippet } from 'svelte';
	let { tabName, className, active, children } = $props<{
		tabName: string;
		className?: string;
		active?: boolean;
		children?: Snippet;
	}>();
</script>

<!-- Each tab content linked to its corresponding radio via id -->
<div
	class="tab-content bg-base-100 {className}"
	role="tabpanel"
	id={`${tabName}-content`}
	aria-labelledby={tabName}
	class:active
>
	{#if children}
		{@render children()}
	{/if}
</div>
