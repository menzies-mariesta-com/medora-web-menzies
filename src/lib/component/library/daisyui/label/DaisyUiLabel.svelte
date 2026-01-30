<script lang="ts">
	let { className, forText, children } = $props<{
		className?: string;
		forText?: string;

		children?: () => void;
	}>();
</script>

{#if children}
	<label for={forText} class={className}>
		{@render children()}
	</label>
{:else}
	<label for={forText} class={className}> </label>
{/if}
