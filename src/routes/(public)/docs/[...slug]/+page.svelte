<script lang="ts">
	import DocsArticle from '$lib/component/own/global/public/docs/DocsArticle.svelte';
	import DocsBreadcrumbs from '$lib/component/own/global/public/docs/DocsBreadcrumbs.svelte';
	import DocsToc from '$lib/component/own/global/public/docs/DocsToc.svelte';
	import DocsPrevNext from '$lib/component/own/global/public/docs/DocsPrevNext.svelte';
	import CodeCopyEnhance from '$lib/component/own/global/public/docs/CodeCopyEnhance.svelte';
	import SeoHead from '$lib/component/own/snippet/seo/SeoHead.svelte';
	import { collectToc, observeActiveHeading } from '$lib/tool/docs/toc';
	import type { TocItem } from '$lib/tool/docs/types';
	import { absoluteAssetUrl, absoluteUrl } from '$lib/util/seo.util';

	let { data } = $props();

	let articleEl = $state<HTMLElement | null>(null);
	let tocItems = $state<TocItem[]>([]);
	let activeId = $state<string | null>(null);
	let pinnedId = $state<string | null>(null);
	let pinTimer: ReturnType<typeof setTimeout> | undefined;

	const title = $derived(
		data.doc.frontmatter.title
			? `${data.doc.frontmatter.title} | Medora docs`
			: 'Medora docs'
	);
	const description = $derived(
		data.doc.frontmatter.description ?? 'Medora hospital documentation'
	);
	const path = $derived('/docs/' + (data.slugParts?.join('/') ?? ''));
	const canonical = $derived(absoluteUrl(data.origin, path));
	const ogImage = $derived(absoluteAssetUrl(data.origin));

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'TechArticle',
		headline: data.doc.frontmatter.title,
		description,
		url: canonical
	});

	const crumbs = $derived([
		{ href: '/', label: 'Home' },
		{ href: '/docs/guides/getting-started', label: 'Docs' },
		{ href: path, label: data.doc.frontmatter.title ?? 'Documentation' }
	]);

	function selectTocHeading(id: string) {
		activeId = id;
		pinnedId = id;
		if (pinTimer) clearTimeout(pinTimer);
		pinTimer = setTimeout(() => {
			pinnedId = null;
		}, 900);
	}

	$effect(() => {
		data.slugParts;
		queueMicrotask(() => {
			tocItems = collectToc(articleEl);
		});
	});

	$effect(() => {
		data.slugParts;
		pinnedId = null;
		if (pinTimer) clearTimeout(pinTimer);
		return observeActiveHeading(articleEl, (id) => {
			if (pinnedId) return;
			activeId = id;
		});
	});
</script>

<SeoHead
	{title}
	{description}
	{canonical}
	{ogImage}
	siteName="Medora"
	{jsonLd}
	robots={data.doc.frontmatter.draft ? 'noindex,nofollow' : 'index,follow'}
/>

<div class="flex w-full">
	<div class="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">
		<DocsBreadcrumbs items={crumbs} />
		<p class="mt-4 text-xs font-semibold tracking-wide text-primary uppercase">
			{data.sectionLabel}
		</p>

		<article class="docs-prose mt-2" bind:this={articleEl}>
			{#if data.doc.frontmatter.title}
				<h1>{data.doc.frontmatter.title}</h1>
			{/if}
			{#if data.doc.frontmatter.sinceVersion}
				<p class="text-sm text-base-content/60 not-docs-title">
					Since v{data.doc.frontmatter.sinceVersion}
					{#if data.doc.frontmatter.lastReviewed}
						· Reviewed {data.doc.frontmatter.lastReviewed}
					{/if}
				</p>
			{/if}
			<DocsArticle html={data.doc.html} embedded />
		</article>

		<CodeCopyEnhance root={articleEl} />
		<DocsPrevNext prev={data.prev} next={data.next} />
	</div>

	<aside
		class="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 overflow-y-auto scroll-smooth pt-3 pb-6 pe-5 xl:block"
	>
		<DocsToc items={tocItems} {activeId} onSelect={selectTocHeading} />
	</aside>
</div>
