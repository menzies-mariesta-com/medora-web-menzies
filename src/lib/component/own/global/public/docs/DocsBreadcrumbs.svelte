<script lang="ts">
	let {
		items
	}: {
		items: { href: string; label: string }[];
	} = $props();
</script>

<nav class="text-sm text-ink-muted" aria-label="Breadcrumb">
	<ol class="flex flex-wrap items-center gap-1.5">
		{#each items as item, i (item.href + item.label)}
			{#if i > 0}
				<li aria-hidden="true" class="opacity-50">/</li>
			{/if}
			<li>
				{#if i === items.length - 1}
					<span class="font-medium text-base-content" aria-current="page">{item.label}</span>
				{:else}
					<a href={item.href} class="link link-hover cursor-pointer">{item.label}</a>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
