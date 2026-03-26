<script lang="ts">
	let { className, resizer, children } = $props<{
		className?: string;
		resizer?: boolean;
		children: () => void;
	}>();
</script>

<figure class="d-diff {className}" tabindex="0">
	{@render children()}
	{#if resizer}
		<div class="d-diff-resizer"></div>
	{/if}
</figure>
