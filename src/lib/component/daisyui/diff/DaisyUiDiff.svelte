<script lang="ts">
	let { className, resizer, children } = $props<{
		className?: string;
		resizer?: boolean;
		children: () => void;
	}>();
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<figure class="d-diff {className}" tabindex="0">
	{@render children()}
	{#if resizer}
		<div class="d-diff-resizer"></div>
	{/if}
</figure>
