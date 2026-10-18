<script lang="ts">
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import type { DocsSearchItem } from '$lib/model/type/medora/docs.type';

	let {
		open = false,
		items = [],
		onClose
	} = $props<{
		open?: boolean;
		items?: DocsSearchItem[];
		onClose?: () => void;
	}>();

	let q = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (open && searchInput) {
			searchInput.focus();
		}
	});

	const filtered = $derived.by(() => {
		const t = q.trim().toLowerCase();
		if (!t) return items.slice(0, 12);
		return items
			.filter(
				(i) =>
					i.title.toLowerCase().includes(t) ||
					i.keywords.toLowerCase().includes(t) ||
					i.category.toLowerCase().includes(t)
			)
			.slice(0, 20);
	});

	function close() {
		onClose?.();
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			if (!open) return;
		}
	}}
/>

{#if open}
	<WashDialog
		open={true}
		onClose={close}
		boxClassName="max-w-xl p-0"
		showActions={false}
		showDefaultClose={false}
		closeOnOutsideClick={true}
	>
		{#snippet children()}
			<input
				bind:this={searchInput}
				class="input w-full rounded-none border-0 border-b border-base-300 focus:outline-none"
				placeholder="Search documentation..."
				bind:value={q}
			/>
			<ul class="menu max-h-[50vh] overflow-y-auto p-2">
				{#each filtered as item (item.href)}
					<li>
						<a
							class="cursor-pointer"
							href={item.href}
							onclick={() => close()}
						>
							<span class="text-xs opacity-60">{item.category}</span>
							<span class="font-medium">{item.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/snippet}
	</WashDialog>
{/if}
