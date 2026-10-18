<script lang="ts">
	import DocsArticle from '$lib/component/own/global/public/docs/DocsArticle.svelte';
	import SeoHead from '$lib/component/own/snippet/seo/SeoHead.svelte';
	import { absoluteAssetUrl, absoluteUrl } from '$lib/util/seo.util';

	let { data } = $props();

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

<div class="mx-auto max-w-3xl">
	<h1 class="text-primary mb-2 text-3xl font-bold tracking-tight">
		{data.doc.frontmatter.title ?? 'Documentation'}
	</h1>
	{#if data.doc.frontmatter.sinceVersion}
		<p class="mb-6 text-sm text-base-content/60">
			Since v{data.doc.frontmatter.sinceVersion}
			{#if data.doc.frontmatter.lastReviewed}
				· Reviewed {data.doc.frontmatter.lastReviewed}
			{/if}
		</p>
	{/if}
	<DocsArticle html={data.doc.html} />
</div>
