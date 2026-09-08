<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<span class="indicator-item {className}">
	{#if children}
		{@render children()}
	{/if}
</span>
