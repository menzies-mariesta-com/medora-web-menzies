<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import LucideRefreshCcw from '$lib/component/own/library/lucide/LucideRefreshCcw.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';

	let {
		title,
		description = '',
		loading = false,
		onRefresh,
		addLabel = '',
		onAdd
	}: {
		title: string;
		description?: string;
		loading?: boolean;
		onRefresh?: () => void;
		addLabel?: string;
		onAdd?: () => void;
	} = $props();
</script>

<header class="flex flex-wrap items-start justify-between gap-3">
	<div>
		<h1 class="text-xl font-bold text-primary">{title}</h1>
		{#if description}
			<p class="text-sm opacity-70">{description}</p>
		{/if}
	</div>
	<div class="flex flex-wrap items-center gap-2">
		{@render refreshButton()}
		{#if addLabel && onAdd}
			<WashButton
				variant="primary"
				size="sm"
				className="cursor-pointer"
				onClick={onAdd}
			>
				<LucidePlus className="size-4" />
				{addLabel}
			</WashButton>
		{/if}
	</div>
</header>

{#snippet refreshButton()}
	{#if onRefresh}
		<WashButton
			variant="ghost"
			size="sm"
			className="cursor-pointer"
			{loading}
			disabled={loading}
			onClick={onRefresh}
		>
			<LucideRefreshCcw className="size-4" />
			Refresh
		</WashButton>
	{/if}
{/snippet}
