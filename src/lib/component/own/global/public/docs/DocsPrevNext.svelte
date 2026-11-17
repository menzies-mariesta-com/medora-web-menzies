<script lang="ts">
	import type { DocAdjacentItem } from '$lib/tool/docs/types';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';

	let {
		prev,
		next
	}: {
		prev: DocAdjacentItem | null;
		next: DocAdjacentItem | null;
	} = $props();
</script>

{#if prev || next}
	<nav
		class="mt-12 flex flex-col gap-3 border-t border-ink-border/80 pt-6 sm:flex-row sm:justify-between"
		aria-label="Adjacent pages"
	>
		{#if prev}
			<a
				href={prev.href}
				class="group flex cursor-pointer flex-col gap-1 rounded-box border border-ink-border/80 bg-base-100/60 px-4 py-3 transition-colors hover:bg-primary/20 sm:max-w-[48%]"
			>
				<span class="flex items-center gap-1 text-xs text-ink-muted">
					<LucideArrowLeft className="size-3.5" />
					Previous
				</span>
				<span class="font-medium group-hover:text-primary">{prev.title}</span>
			</a>
		{:else}
			<span class="hidden sm:block sm:max-w-[48%]"></span>
		{/if}
		{#if next}
			<a
				href={next.href}
				class="group flex cursor-pointer flex-col gap-1 rounded-box border border-ink-border/80 bg-base-100/60 px-4 py-3 text-end transition-colors hover:bg-primary/20 sm:ms-auto sm:max-w-[48%]"
			>
				<span class="flex items-center justify-end gap-1 text-xs text-ink-muted">
					Next
					<LucideChevronRight className="size-3.5" />
				</span>
				<span class="font-medium group-hover:text-primary">{next.title}</span>
			</a>
		{/if}
	</nav>
{/if}
