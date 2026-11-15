<script lang="ts">
	let { colors = [] }: { colors?: string[] } = $props();
	const shown = $derived(colors.slice(0, 8));
</script>

<span class="inline-flex max-w-full items-center gap-1">
	<span class="text-xs tabular-nums">{colors.length}</span>
	{#each shown as color, index (`${color}-${index}`)}
		<span
			class="size-3 shrink-0 rounded-full border border-base-300"
			style="background-color: {color}"
			aria-hidden="true"
		></span>
	{/each}
</span>
