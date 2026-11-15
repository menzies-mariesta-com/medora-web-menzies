<script lang="ts">
	import { goto } from '$app/navigation';
	import type { DocsSearchItem } from '$lib/model/type/medora/docs.type';
	import LucideSearch from '$lib/component/own/library/lucide/LucideSearch.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';

	let {
		entries,
		open = $bindable(false)
	}: {
		entries: DocsSearchItem[];
		open?: boolean;
	} = $props();

	let query = $state('');
	let selected = $state(0);
	let dialogEl = $state<HTMLDialogElement | null>(null);
	let inputEl = $state<HTMLInputElement | null>(null);
	let listEl = $state<HTMLUListElement | null>(null);
	let wasOpen = $state(false);

	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return entries.slice(0, 8);
		return entries
			.filter((e) => {
				const hay = `${e.title} ${e.category} ${e.keywords} ${e.href}`.toLowerCase();
				return hay.includes(q);
			})
			.slice(0, 12);
	});

	$effect(() => {
		const dialog = dialogEl;
		if (!dialog) return;

		if (open && !wasOpen) {
			wasOpen = true;
			query = '';
			selected = 0;
			if (!dialog.open) dialog.showModal();
			requestAnimationFrame(() => inputEl?.focus());
		} else if (!open && wasOpen) {
			wasOpen = false;
			if (dialog.open) dialog.close();
		} else if (open && !dialog.open) {
			dialog.showModal();
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	$effect(() => {
		void query;
		selected = 0;
	});

	$effect(() => {
		void selected;
		void results;
		const active = listEl?.querySelector<HTMLElement>('[data-active="true"]');
		const reduce =
			typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
		active?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
	});

	function close() {
		open = false;
	}

	function selectAt(index: number) {
		const entry = results[index];
		if (!entry) return;
		close();
		void goto(entry.href);
	}

	function onDialogKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (results.length === 0) return;
			selected = (selected + 1) % results.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (results.length === 0) return;
			selected = (selected - 1 + results.length) % results.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			selectAt(selected);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			open = !open;
		}
	}

	function onDialogClose() {
		open = false;
		wasOpen = false;
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<dialog
	bind:this={dialogEl}
	class="modal modal-middle"
	aria-label="Search documentation"
	onclose={onDialogClose}
	oncancel={(e) => {
		e.preventDefault();
		close();
	}}
>
	<div
		class="modal-box flex max-h-[min(32rem,85dvh)] w-11/12 max-w-lg flex-col gap-0 overflow-hidden p-0"
		role="presentation"
		onkeydown={onDialogKeydown}
	>
		<div class="flex items-center gap-2 border-b border-ink-border px-3 py-2">
			<LucideSearch className="size-4 shrink-0 text-base-content/70" strokeWidth={2} />
			<input
				bind:this={inputEl}
				bind:value={query}
				type="search"
				class="input input-ghost h-10 min-h-10 w-full cursor-text border-0 bg-transparent px-0 focus:outline-none"
				placeholder="Search docs…"
				aria-label="Search docs"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
			/>
			<div class="tooltip tooltip-secondary" data-tip="Close">
				<button
					type="button"
					class="btn btn-ghost btn-square btn-sm btn-secondary cursor-pointer"
					aria-label="Close"
					onclick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						close();
					}}
				>
					<LucideX className="size-4" />
				</button>
			</div>
		</div>

		<ul bind:this={listEl} class="max-h-80 flex-1 overflow-y-auto p-2" role="listbox">
			{#if results.length === 0}
				<li class="px-3 py-6 text-center text-sm text-ink-muted">No matching pages</li>
			{:else}
				{#each results as entry, i (entry.href)}
					<li role="option" aria-selected={i === selected}>
						<button
							type="button"
							data-active={i === selected ? 'true' : 'false'}
							class="flex w-full cursor-pointer flex-col gap-0.5 rounded-btn px-3 py-2 text-start transition-colors {i ===
							selected
								? 'bg-primary/40'
								: ''}"
							onclick={() => selectAt(i)}
							onmouseenter={() => (selected = i)}
						>
							<span class="font-medium">{entry.title}</span>
							<span class="line-clamp-1 text-xs text-ink-muted">{entry.category}</span>
						</button>
					</li>
				{/each}
			{/if}
		</ul>

		<p class="border-t border-ink-border px-3 py-2 text-xs text-ink-muted">
			<span class="kbd kbd-xs">↑</span>
			<span class="kbd kbd-xs">↓</span>
			to navigate ·
			<span class="kbd kbd-xs">Enter</span>
			to open ·
			<span class="kbd kbd-xs">Esc</span>
			to close
		</p>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button type="submit" class="cursor-pointer" aria-label="Close search">close</button>
	</form>
</dialog>
