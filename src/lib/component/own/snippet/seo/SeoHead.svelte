<script lang="ts">
	import { serializeJsonLd } from '$lib/util/seo.util';

	type SeoHeadProps = {
		title: string;
		description: string;
		canonical: string;
		ogImage: string;
		siteName: string;
		robots?: string;
		ogType?: string;
		jsonLd?: unknown;
	};

	/**
	 * Shared public SEO head: title, description, canonical, OG, Twitter, optional robots + JSON-LD.
	 * Use on indexable marketing/docs pages. Auth/private shells use robots noindex instead.
	 */
	let {
		title,
		description,
		canonical,
		ogImage,
		siteName,
		robots = 'index,follow',
		ogType = 'website',
		jsonLd = undefined
	}: SeoHeadProps = $props();

	const jsonLdText = $derived(
		jsonLd === undefined ? null : serializeJsonLd(jsonLd)
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="robots" content={robots} />
	<link rel="canonical" href={canonical} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:type" content={ogType} />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:image" content={ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
	{#if jsonLdText}
		{@html `<script type="application/ld+json">${jsonLdText}</script>`}
	{/if}
</svelte:head>
