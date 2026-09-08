<script lang="ts">
	import type { Snippet } from 'svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';

	/**
	 * Menzies Design Auth template card shell (Templates → Auth).
	 */
	let {
		title,
		description,
		titleTone = 'primary',
		maxWidthClass = 'max-w-sm',
		children,
		actions,
		leading
	}: {
		title: string;
		description?: string;
		titleTone?: 'primary' | 'secondary' | 'success';
		maxWidthClass?: string;
		children?: Snippet;
		actions?: Snippet;
		leading?: Snippet;
	} = $props();

	const titleClass = $derived(
		titleTone === 'success'
			? 'card-title justify-center text-success font-bold'
			: titleTone === 'secondary'
				? 'card-title text-secondary font-bold'
				: 'card-title text-primary font-bold'
	);
</script>

<WashCard
	className="w-full {maxWidthClass} border border-base-300 shadow-sm"
>
	<WashCardBody className="gap-4 {titleTone === 'success' ? 'items-center text-center' : ''}">
		{#if titleTone === 'success'}
			{#if leading}
				{@render leading()}
			{/if}
			<div>
				<WashCardBodyTitle className={titleClass}>{title}</WashCardBodyTitle>
				{#if description}
					<p class="text-sm text-ink-muted">{description}</p>
				{/if}
			</div>
		{:else if leading}
			<div class="flex items-start gap-3">
				{@render leading()}
				<div class="min-w-0 flex-1">
					<WashCardBodyTitle className={titleClass}>{title}</WashCardBodyTitle>
					{#if description}
						<p class="text-sm text-ink-muted">{description}</p>
					{/if}
				</div>
			</div>
		{:else}
			<div>
				<WashCardBodyTitle className={titleClass}>{title}</WashCardBodyTitle>
				{#if description}
					<p class="text-sm text-ink-muted">{description}</p>
				{/if}
			</div>
		{/if}

		{#if children}
			{@render children()}
		{/if}

		{#if actions}
			<div class="card-actions mt-1 w-full flex-col gap-2">
				{@render actions()}
			</div>
		{/if}
	</WashCardBody>
</WashCard>
