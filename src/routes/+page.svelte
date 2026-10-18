<script lang="ts">
	import MedoraHomeNav from '$lib/component/own/local/public/home/MedoraHomeNav.svelte';
	import MedoraHomeHero from '$lib/component/own/local/public/home/MedoraHomeHero.svelte';
	import MedoraHomeHowItWorks from '$lib/component/own/local/public/home/MedoraHomeHowItWorks.svelte';
	import MedoraHomeModules from '$lib/component/own/local/public/home/MedoraHomeModules.svelte';
	import MedoraHomeCareModel from '$lib/component/own/local/public/home/MedoraHomeCareModel.svelte';
	import MedoraHomeSurfaces from '$lib/component/own/local/public/home/MedoraHomeSurfaces.svelte';
	import MedoraHomeIntegrated from '$lib/component/own/local/public/home/MedoraHomeIntegrated.svelte';
	import MedoraHomeCta from '$lib/component/own/local/public/home/MedoraHomeCta.svelte';
	import MedoraHomeFooter from '$lib/component/own/local/public/home/MedoraHomeFooter.svelte';
	import SeoHead from '$lib/component/own/snippet/seo/SeoHead.svelte';
	import { m } from '$lib/paraglide/messages';
	import { absoluteAssetUrl, absoluteUrl } from '$lib/util/seo.util';

	let { data } = $props();

	const title = $derived(m.home_seo_title());
	const description = $derived(m.home_seo_description());
	const siteName = $derived(m.menzies_medora());
	const canonical = $derived(absoluteUrl(data.origin, '/'));
	const ogImage = $derived(absoluteAssetUrl(data.origin));

	const jsonLd = $derived([
		{
			'@context': 'https://schema.org',
			'@type': 'Organization',
			name: siteName,
			url: canonical,
			description
		},
		{
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: siteName,
			url: canonical,
			description
		},
		{
			'@context': 'https://schema.org',
			'@type': 'SoftwareApplication',
			name: siteName,
			applicationCategory: 'HealthApplication',
			operatingSystem: 'Web',
			url: canonical,
			description
		}
	]);
</script>

<SeoHead
	{title}
	{description}
	{canonical}
	{ogImage}
	{siteName}
	{jsonLd}
/>

<div class="medora-marketing paper-grain min-h-screen">
	<MedoraHomeNav />
	<main>
		<MedoraHomeHero />
		<MedoraHomeHowItWorks />
		<MedoraHomeModules />
		<MedoraHomeCareModel />
		<MedoraHomeSurfaces />
		<MedoraHomeIntegrated />
		<MedoraHomeCta />
	</main>
	<MedoraHomeFooter />
</div>
