<script lang="ts">
	import LucideSearch from '$lib/component/own/library/lucide/LucideSearch.svelte';
	import OverflowText from '$lib/component/own/library/menzies/overflow-marquee/OverflowText.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	export type CommandSearchOption = { value: string; label: string };

	let {
		options = [],
		onPick,
		filterPlaceholder = 'Search…',
		emptyMessage = 'No matches.',
		keyboardHint = '',
		inputId = 'medora-command-search-input',
		autofocus = true
	}: {
		options?: CommandSearchOption[];
		onPick?: (value: string) => void;
		filterPlaceholder?: string;
		emptyMessage?: string;
		keyboardHint?: string;
		inputId?: string;
		autofocus?: boolean;
	} = $props();

	const lifeCycleUtil = new LifeCycleUtil();

	let query = $state('');
	let activeIndex = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);
	let listEl = $state<HTMLUListElement | null>(null);

	function matchesFilter(q: string, text: string): boolean {
		return text.toLowerCase().includes(q.trim().toLowerCase());
	}

	const filtered = $derived.by(() => {
		const q = query.trim();
		if (!q) return options;
		return options.filter(
			(o) => matchesFilter(q, o.label) || matchesFilter(q, o.value)
		);
	});

	const listboxId = $derived(`${inputId}-listbox`);

	$effect(() => {
		void query;
		void options.length;
		activeIndex = 0;
	});

	$effect(() => {
		const idx = activeIndex;
		const list = listEl;
		if (!list) return;
		queueMicrotask(() => {
			const el = list.querySelector<HTMLElement>(
				`[data-cmd-index="${idx}"]`
			);
			el?.scrollIntoView({ block: 'nearest' });
		});
	});

	function pick(value: string) {
		onPick?.(value);
	}

	function moveActive(delta: number) {
		if (filtered.length === 0) return;
		activeIndex = Math.min(
			filtered.length - 1,
			Math.max(0, activeIndex + delta)
		);
	}

	function onInputKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			moveActive(1);
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			moveActive(-1);
			return;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			const row = filtered[activeIndex];
			if (row) pick(row.value);
			return;
		}
		if (e.key === 'Home') {
			e.preventDefault();
			activeIndex = 0;
			return;
		}
		if (e.key === 'End') {
			e.preventDefault();
			activeIndex = Math.max(0, filtered.length - 1);
		}
	}

	lifeCycleUtil.onMount(() => {
		if (autofocus) {
			queueMicrotask(() => inputEl?.focus());
		}
	});
</script>

<div class="flex min-h-0 flex-col gap-2">
	<label
		class="input input-bordered flex w-full items-center gap-2 border-ink-border"
	>
		<LucideSearch className="size-4 shrink-0 opacity-60" aria-hidden="true" />
		<input
			bind:this={inputEl}
			id={inputId}
			type="search"
			class="grow bg-transparent outline-none"
			placeholder={filterPlaceholder}
			autocomplete="off"
			spellcheck="false"
			aria-controls={listboxId}
			aria-autocomplete="list"
			aria-activedescendant={filtered[activeIndex]
				? `${inputId}-opt-${activeIndex}`
				: undefined}
			bind:value={query}
			onkeydown={onInputKeydown}
		/>
	</label>
	{#if keyboardHint.trim()}
		<p class="text-xs text-base-content/60">{keyboardHint}</p>
	{/if}
	<ul
		bind:this={listEl}
		id={listboxId}
		role="listbox"
		class="max-h-[min(20rem,50vh)] min-h-[8rem] overflow-y-auto overscroll-contain rounded-box border border-base-300 bg-base-100 p-1"
		aria-label={filterPlaceholder}
	>
		{#if filtered.length === 0}
			<li class="px-3 py-4 text-center text-sm text-base-content/60">
				{emptyMessage}
			</li>
		{:else}
			{#each filtered as option, index (option.value)}
				{@const active = index === activeIndex}
				<li
					id="{inputId}-opt-{index}"
					role="option"
					aria-selected={active}
					data-cmd-index={index}
				>
					<button
						type="button"
						class="flex w-full min-w-0 cursor-pointer rounded-[var(--radius-field)] px-3 py-2 text-start text-sm transition-colors hover:bg-base-200 {active
							? 'bg-primary/10 font-medium ring-1 ring-primary/30'
							: ''}"
						onmousedown={(e) => e.preventDefault()}
						onclick={() => pick(option.value)}
						onmouseenter={() => (activeIndex = index)}
					>
						<OverflowText className="min-w-0 flex-1" text={option.label} />
					</button>
				</li>
			{/each}
		{/if}
	</ul>
</div>
