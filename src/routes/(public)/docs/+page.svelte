<script lang="ts">
	import DocsOverviewHero from '$lib/component/own/global/public/docs/DocsOverviewHero.svelte';
	import DocsStatGrid from '$lib/component/own/global/public/docs/DocsStatGrid.svelte';
	import SeoHead from '$lib/component/own/snippet/seo/SeoHead.svelte';
	import { m } from '$lib/paraglide/messages';
	import { absoluteAssetUrl, absoluteUrl, serializeJsonLd } from '$lib/util/seo.util';

	let { data } = $props();
	const msg = m as Record<string, (inputs?: object) => string>;

	const title = $derived(msg.docs_seo_title());
	const description = $derived(msg.docs_seo_description());
	const canonical = $derived(absoluteUrl(data.origin, '/docs'));
	const ogImage = $derived(absoluteAssetUrl(data.origin));
	const siteName = $derived(m.menzies_medora());

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: title,
		description,
		url: canonical
	});
</script>

<SeoHead {title} {description} canonical={canonical} ogImage={ogImage} siteName={siteName} jsonLd={jsonLd} />

<div class="mx-auto max-w-5xl space-y-8">
	<DocsOverviewHero />
	<DocsStatGrid stats={data.stats} />
	<section>
		<h2 class="text-lg font-bold">{msg.docs_built_on_title()}</h2>
		<p class="text-sm text-base-content/70">{msg.docs_built_on_body()}</p>
	</section>
</div>
