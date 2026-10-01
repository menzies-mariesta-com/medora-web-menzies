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
	import { m } from '$lib/paraglide/messages';

	let { data } = $props();

	const title = $derived(m.home_seo_title());
	const description = $derived(m.home_seo_description());
	const canonical = $derived(data.origin.replace(/\/$/, ''));
	const ogImage = $derived(`${canonical}/og-medora.svg`);

	const jsonLd = $derived(
		JSON.stringify([
			{
				'@context': 'https://schema.org',
				'@type': 'Organization',
				name: m.menzies_medora(),
				url: canonical,
				description
			},
			{
				'@context': 'https://schema.org',
				'@type': 'WebSite',
				name: m.menzies_medora(),
				url: canonical,
				description
			},
			{
				'@context': 'https://schema.org',
				'@type': 'SoftwareApplication',
				name: m.menzies_medora(),
				applicationCategory: 'HealthApplication',
				operatingSystem: 'Web',
				url: canonical,
				description
			}
		])
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href="{canonical}/" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content="{canonical}/" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={m.menzies_medora()} />
	<meta property="og:image" content={ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

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
