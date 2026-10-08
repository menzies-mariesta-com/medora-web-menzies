<script lang="ts">
	import type { Snippet } from 'svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideRefreshCcw from '$lib/component/own/library/lucide/LucideRefreshCcw.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	let {
		title,
		count,
		isLoading = false,
		isEmpty = false,
		emptyMessage,
		showAdd = true,
		showRefresh = true,
		addLabel,
		addDisabled = false,
		addAriaLabel,
		onAdd,
		onRefresh,
		headerExtra,
		footer,
		children
	}: {
		title: string;
		count?: number;
		isLoading?: boolean;
		isEmpty?: boolean;
		emptyMessage: string;
		showAdd?: boolean;
		showRefresh?: boolean;
		addLabel?: string;
		addDisabled?: boolean;
		addAriaLabel?: string;
		onAdd?: () => void;
		onRefresh?: () => void;
		headerExtra?: Snippet;
		footer?: Snippet;
		children?: Snippet;
	} = $props();

	const resolvedAddLabel = $derived(
		addAriaLabel ?? addLabel ?? msg.observation_emr_add()
	);
</script>

<WashCard
	className="flex h-full min-h-0 flex-col overflow-hidden border border-ink-border"
>
	<WashCardBody
		className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3"
	>
		<div class="flex shrink-0 items-center justify-between gap-2">
			<div class="flex min-w-0 items-center gap-2">
				<WashCardBodyTitle className="truncate text-base font-semibold">
					{title}
				</WashCardBodyTitle>
				{#if count != null}
					<span
						class="badge badge-ghost badge-sm shrink-0 tabular-nums"
					>
						{count}
					</span>
				{/if}
			</div>
			<div class="flex shrink-0 items-center gap-1">
				{#if headerExtra}
					{@render headerExtra()}
				{/if}
				{#if showRefresh && onRefresh}
					<div
						class="tooltip tooltip-left tooltip-secondary"
						data-tip={msg.observation_emr_refresh()}
					>
						<button
							type="button"
							class="btn btn-ghost btn-square btn-xs btn-secondary cursor-pointer"
							aria-label={msg.observation_emr_refresh()}
							disabled={isLoading}
							class:cursor-not-allowed={isLoading}
							class:btn-disabled={isLoading}
							class:loading={isLoading}
							onclick={() => onRefresh()}
						>
							<LucideRefreshCcw className="size-3.5" />
						</button>
					</div>
				{/if}
				{#if showAdd && onAdd}
					<div
						class="tooltip tooltip-left tooltip-primary"
						data-tip={resolvedAddLabel}
					>
						<button
							type="button"
							class="btn btn-ghost btn-square btn-xs btn-primary"
							class:cursor-pointer={!addDisabled && !isLoading}
							class:cursor-not-allowed={addDisabled || isLoading}
							class:btn-disabled={addDisabled || isLoading}
							disabled={addDisabled || isLoading}
							aria-label={resolvedAddLabel}
							onclick={() => onAdd()}
						>
							<LucidePlus className="size-3.5" />
						</button>
					</div>
				{/if}
			</div>
		</div>

		{#if isLoading}
			<p class="text-ink-muted text-sm">{m.loading()}</p>
		{:else if isEmpty}
			<p class="text-ink-muted py-4 text-center text-sm">{emptyMessage}</p>
		{:else if children}
			<div class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
				{@render children()}
			</div>
		{/if}

		{#if !isLoading && footer}
			<div class="shrink-0 border-t border-ink-border/60 pt-2">
				{@render footer()}
			</div>
		{/if}
	</WashCardBody>
</WashCard>
