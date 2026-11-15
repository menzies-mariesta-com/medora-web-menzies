<script lang="ts">
	import LucideMenu from '$lib/component/own/library/lucide/LucideMenu.svelte';
	import LucideSearch from '$lib/component/own/library/lucide/LucideSearch.svelte';
	import { WASH_UI_VERSION } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import BrandMark from './BrandMark.svelte';
	import ThemeSwitcher from './ThemeSwitcher.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	let {
		onSearch,
		onMenu,
		shell = false
	}: {
		onSearch?: () => void;
		onMenu?: () => void;
		shell?: boolean;
	} = $props();

	let isMac = $state(false);

	$effect(() => {
		isMac =
			typeof navigator !== 'undefined' &&
			(/Mac|iPhone|iPad|iPod/i.test(navigator.platform) ||
				/Mac OS X/i.test(navigator.userAgent));
	});
</script>

<header
	class="app-chrome-bar sticky top-0 z-30 border-b border-ink-border/80 bg-base-100/80 px-4 backdrop-blur-sm lg:px-6 {shell
		? ''
		: 'z-40'}"
>
	<div class="flex w-full min-w-0 items-center justify-between gap-3">
		<div class="flex min-w-0 flex-row items-center gap-2 sm:gap-3">
			{#if onMenu}
				<button
					type="button"
					class="btn btn-ghost btn-square shrink-0 ripple cursor-pointer lg:hidden"
					aria-label={msg.docs_open_menu()}
					onclick={onMenu}
				>
					<LucideMenu className="size-5 text-base-content" strokeWidth={2} />
				</button>
			{/if}

			<a href="/" class="flex min-w-0 flex-row items-center gap-2.5 cursor-pointer sm:gap-3">
				<BrandMark size={shell ? 'md' : 'sm'} />
				<span class="flex min-w-0 flex-col leading-tight">
					<span
						class="font-display truncate font-semibold tracking-tight {shell
							? 'text-xl lg:text-2xl'
							: 'text-lg sm:text-xl'}"
					>
						{msg.docs_title()}
					</span>
					<span class="label-ink hidden truncate sm:inline"
						>Wash UI v{WASH_UI_VERSION}</span
					>
				</span>
			</a>
		</div>

		<div class="flex shrink-0 flex-row items-center gap-1 sm:gap-2">
			{#if onSearch}
				<button
					type="button"
					class="btn btn-ghost hidden h-10 min-h-10 w-64 justify-start gap-2 border border-ink-border bg-base-100 px-3 font-normal ripple cursor-pointer md:inline-flex lg:w-72 xl:w-80"
					aria-label="Search"
					onclick={onSearch}
				>
					<LucideSearch className="size-4 shrink-0 text-base-content/75" strokeWidth={2} />
					<span class="min-w-0 flex-1 truncate text-left text-sm text-base-content/60"
						>Search pages…</span
					>
					<kbd class="kbd kbd-sm shrink-0 border-ink-border bg-base-200 text-[0.65rem]"
						>{isMac ? '⌘' : 'Ctrl'}K</kbd
					>
				</button>
				<div class="tooltip tooltip-secondary md:hidden" data-tip="Search">
					<button
						type="button"
						class="btn btn-ghost btn-square ripple cursor-pointer"
						aria-label="Search"
						onclick={onSearch}
					>
						<LucideSearch className="size-5 text-base-content" strokeWidth={2} />
					</button>
				</div>
			{/if}
			<ThemeSwitcher />
		</div>
	</div>
</header>
