<script lang="ts">
	import type { Snippet } from 'svelte';
	let { checked, groupName, className, children } = $props<{
		checked: 'true' | 'false';
		groupName: string;
		className?: string;
		children?: Snippet;
	}>();
</script>

<div
	class="collapse-plus collapse border border-base-300 bg-base-100 {className}"
>
	<input type="radio" name={groupName} {checked} />
	{#if children}
		{@render children()}
	{/if}
</div>
