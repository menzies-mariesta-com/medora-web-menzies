<script lang="ts">
	import DocsSidebar from '$lib/component/own/global/public/docs/DocsSidebar.svelte';
	import DocsSearch from '$lib/component/own/global/public/docs/DocsSearch.svelte';
	import SiteHeader from '$lib/component/own/global/public/docs/SiteHeader.svelte';
	import BrandMark from '$lib/component/own/global/public/docs/BrandMark.svelte';
	import { WASH_UI_VERSION } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	let { data, children } = $props();

	let searchOpen = $state(false);
	let drawerOpen = $state(false);

	const activePath = $derived(page.url.pathname);

	$effect(() => {
		page.url.pathname;
		drawerOpen = false;
	});
</script>

<DocsSearch entries={data.searchIndex} bind:open={searchOpen} />

<div class="drawer lg:drawer-open">
	<input id="docs-drawer" type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />

	<div class="drawer-content flex min-h-dvh flex-col">
		<SiteHeader
			shell
			onSearch={() => (searchOpen = true)}
			onMenu={() => (drawerOpen = true)}
		/>
		<div class="min-w-0 flex-1">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</div>

	<div class="drawer-side z-40">
		<label for="docs-drawer" class="drawer-overlay cursor-pointer" aria-label="Close sidebar"
		></label>
		<aside
			class="flex min-h-full w-[280px] flex-col border-r border-ink-border bg-base-100 paper-grain"
		>
			<div class="app-chrome-bar border-b border-ink-border/80 px-5">
				<a href="/" class="flex min-w-0 flex-row items-center gap-2.5 cursor-pointer">
					<BrandMark size="md" />
					<span class="flex min-w-0 flex-col leading-tight">
						<span class="font-display truncate text-xl font-semibold tracking-tight lg:text-2xl">
							{msg.docs_title()}
						</span>
						<span class="label-ink mt-0.5 truncate">Wash UI v{WASH_UI_VERSION}</span>
					</span>
				</a>
			</div>
			<DocsSidebar
				modules={data.modules}
				{activePath}
				onNavigate={() => (drawerOpen = false)}
			/>
		</aside>
	</div>
</div>
