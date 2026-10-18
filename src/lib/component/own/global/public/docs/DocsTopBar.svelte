<script lang="ts">
	import MedoraBrandWordmark from '$lib/component/own/global/MedoraBrandWordmark.svelte';
	import LucideMenu from '$lib/component/own/library/lucide/LucideMenu.svelte';
	import LucideSearch from '$lib/component/own/library/lucide/LucideSearch.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import type { DocsBreadcrumb } from '$lib/model/type/medora/docs.type';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	let {
		breadcrumbs = [],
		mobileNavOpen = false,
		onToggleNav,
		onOpenSearch
	} = $props<{
		breadcrumbs?: DocsBreadcrumb[];
		mobileNavOpen?: boolean;
		onToggleNav?: () => void;
		onOpenSearch?: () => void;
	}>();
</script>

<header
	class="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-ink-border bg-base-100/95 px-3 backdrop-blur sm:gap-4 sm:px-4"
>
	<button
		type="button"
		class="btn btn-ghost btn-square cursor-pointer lg:hidden"
		aria-label={mobileNavOpen ? msg.docs_close_menu() : msg.docs_open_menu()}
		onclick={() => onToggleNav?.()}
	>
		{#if mobileNavOpen}
			<LucideX className="size-5" />
		{:else}
			<LucideMenu className="size-5" />
		{/if}
	</button>
	<MedoraBrandWordmark className="text-lg shrink-0" href={WebRoutesEnum.DOCS} />
	<nav class="hidden min-w-0 flex-1 text-xs text-base-content/60 sm:flex sm:items-center sm:gap-1" aria-label="Breadcrumb">
		{#each breadcrumbs as crumb, i (crumb.label)}
			{#if crumb.href && i < breadcrumbs.length - 1}
				<a class="link link-hover cursor-pointer truncate" href={crumb.href}>{crumb.label}</a>
				<span aria-hidden="true">/</span>
			{:else}
				<span class="truncate font-medium text-base-content">{crumb.label}</span>
			{/if}
		{/each}
	</nav>
	<button
		type="button"
		class="btn btn-ghost btn-sm cursor-pointer gap-2"
		onclick={() => onOpenSearch?.()}
	>
		<LucideSearch className="size-4" />
		<span class="hidden sm:inline">{msg.docs_search_short()}</span>
		<kbd class="kbd kbd-xs hidden md:inline">Ctrl+K</kbd>
	</button>
</header>
