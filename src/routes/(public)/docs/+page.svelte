<script lang="ts">
	import MedoraBrandWordmark from '$lib/component/own/global/MedoraBrandWordmark.svelte';
	import LucideMenu from '$lib/component/own/library/lucide/LucideMenu.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import SeoHead from '$lib/component/own/snippet/seo/SeoHead.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';
	import { absoluteAssetUrl, absoluteUrl } from '$lib/util/seo.util';

	let { data } = $props();

	const msg = m as Record<string, (inputs?: object) => string>;

	const title = $derived(msg.docs_seo_title());
	const description = $derived(msg.docs_seo_description());
	const siteName = $derived(m.menzies_medora());
	const canonical = $derived(absoluteUrl(data.origin, '/docs'));
	const ogImage = $derived(absoluteAssetUrl(data.origin));

	type DocsNavItem = { id: string; labelKey: string };

	const navItems: DocsNavItem[] = [
		{ id: 'getting-started', labelKey: 'docs_nav_getting_started' },
		{ id: 'modules', labelKey: 'docs_nav_modules' },
		{ id: 'inventory', labelKey: 'docs_nav_inventory' },
		{ id: 'medication-order', labelKey: 'docs_nav_medication_order' },
		{ id: 'coding-standards', labelKey: 'docs_nav_coding_standards' },
		{ id: 'faq', labelKey: 'docs_nav_faq' }
	];

	let activeId = $state('getting-started');
	let mobileNavOpen = $state(false);

	function selectSection(id: string) {
		activeId = id;
		mobileNavOpen = false;
	}

	function navLabel(key: string): string {
		return msg[key]?.() ?? key;
	}

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: title,
		description,
		url: canonical,
		isPartOf: {
			'@type': 'WebSite',
			name: siteName,
			url: absoluteUrl(data.origin, '/')
		}
	});
</script>

<SeoHead
	{title}
	{description}
	{canonical}
	{ogImage}
	{siteName}
	{jsonLd}
/>

<div class="flex min-h-screen flex-col bg-base-100">
	<header
		class="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-ink-border bg-base-100/95 px-3 backdrop-blur sm:px-4"
	>
		<button
			type="button"
			class="btn btn-ghost btn-square cursor-pointer lg:hidden"
			aria-label={msg.docs_open_menu()}
			aria-expanded={mobileNavOpen}
			onclick={() => (mobileNavOpen = !mobileNavOpen)}
		>
			{#if mobileNavOpen}
				<LucideX className="size-5" />
			{:else}
				<LucideMenu className="size-5" />
			{/if}
		</button>
		<MedoraBrandWordmark className="text-lg" href={WebRoutesEnum.DOCS} />
		<span class="hidden text-sm text-base-content/50 sm:inline">
			{msg.docs_title()}
		</span>
	</header>

	<div class="relative flex min-h-0 flex-1">
		{#if mobileNavOpen}
			<button
				type="button"
				class="fixed inset-0 z-10 cursor-pointer bg-base-content/20 lg:hidden"
				aria-label={msg.docs_close_menu()}
				onclick={() => (mobileNavOpen = false)}
			></button>
		{/if}

		<aside
			class="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-ink-border bg-base-200 pt-14 transition-transform duration-200 lg:static lg:z-0 lg:translate-x-0 lg:pt-0 {mobileNavOpen
				? 'translate-x-0'
				: '-translate-x-full lg:translate-x-0'}"
			aria-label={msg.docs_nav_aria()}
		>
			<nav class="min-h-0 flex-1 overflow-y-auto px-2 py-4">
				<ul class="menu menu-md w-full gap-0.5 p-0">
					{#each navItems as item (item.id)}
						<li>
							<a
								href={`#${item.id}`}
								class="cursor-pointer"
								class:menu-active={activeId === item.id}
								class:menu-wash-active={activeId === item.id}
								aria-current={activeId === item.id
									? 'page'
									: undefined}
								onclick={(e) => {
									e.preventDefault();
									selectSection(item.id);
								}}
							>
								{navLabel(item.labelKey)}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		</aside>

		<main class="min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12">
			<article class="mx-auto max-w-3xl">
				<h1 class="text-primary mb-4 text-3xl font-bold tracking-tight">
					{msg.docs_title()}
				</h1>
				<p class="text-base-content/80 leading-relaxed">
					{msg.docs_placeholder_intro()}
				</p>
				<section id={activeId} class="mt-8 space-y-4">
					<h2 class="text-xl font-semibold text-base-content">
						{navLabel(
							navItems.find((n) => n.id === activeId)?.labelKey ??
								'docs_nav_getting_started'
						)}
					</h2>
					{#if activeId === 'coding-standards'}
						<p class="text-base-content/70 leading-relaxed">
							{msg.docs_coding_standards_body()}
						</p>
						<p class="text-base-content/60 text-sm leading-relaxed">
							{msg.icd_who_attribution()}
						</p>
					{:else}
						<p class="text-base-content/70 leading-relaxed">
							{msg.docs_placeholder_body()}
						</p>
						<p class="text-base-content/60 text-sm leading-relaxed">
							{msg.docs_placeholder_more()}
						</p>
					{/if}
				</section>
			</article>
		</main>
	</div>
</div>
