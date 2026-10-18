<script lang="ts">
	import { page } from '$app/state';
	import DocsSidebar from './DocsSidebar.svelte';
	import DocsTopBar from './DocsTopBar.svelte';
	import DocsSearchPalette from './DocsSearchPalette.svelte';
	import type { DocsManifestModule } from '$lib/docs/manifest.types';
	import type { DocsSearchItem } from '$lib/model/type/medora/docs.type';
	import manifest from '$lib/docs/manifest.json';

	let { children, modules = [], searchItems = [] } = $props<{
		children?: import('svelte').Snippet;
		modules?: DocsManifestModule[];
		searchItems?: DocsSearchItem[];
	}>();

	let mobileNavOpen = $state(false);
	let searchOpen = $state(false);
	const activePath = $derived(page.url.pathname);

	const breadcrumbs = $derived.by(() => {
		const path = activePath;
		const crumbs = [{ label: 'Docs', href: '/docs' }];
		if (path === '/docs') return crumbs;
		const wf = manifest.workflows.find((w) => w.path === path);
		if (wf) {
			crumbs.push({ label: wf.moduleName, href: `/docs/modules/${wf.moduleSlug}` });
			crumbs.push({ label: wf.title });
			return crumbs;
		}
		const parts = path.replace(/^\/docs\/?/, '').split('/');
		if (parts[0]) crumbs.push({ label: parts.join(' / ') });
		return crumbs;
	});

	function onKey(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			searchOpen = true;
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="flex min-h-screen flex-col bg-base-100">
	<DocsTopBar
		{breadcrumbs}
		{mobileNavOpen}
		onToggleNav={() => (mobileNavOpen = !mobileNavOpen)}
		onOpenSearch={() => (searchOpen = true)}
	/>
	<div class="relative flex min-h-0 flex-1">
		{#if mobileNavOpen}
			<button
				type="button"
				class="fixed inset-0 z-10 cursor-pointer bg-base-content/20 lg:hidden"
				aria-label="Close menu"
				onclick={() => (mobileNavOpen = false)}
			></button>
		{/if}
		<DocsSidebar
			{modules}
			{activePath}
			{mobileNavOpen}
			onNavigate={() => (mobileNavOpen = false)}
		/>
		<main class="min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12">
			{@render children?.()}
		</main>
	</div>
</div>

<DocsSearchPalette
	open={searchOpen}
	items={searchItems}
	onClose={() => (searchOpen = false)}
/>
