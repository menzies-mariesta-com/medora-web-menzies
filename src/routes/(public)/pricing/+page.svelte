<script lang="ts">
	import MedoraHomeNav from '$lib/component/own/local/public/home/MedoraHomeNav.svelte';
	import MedoraHomeFooter from '$lib/component/own/local/public/home/MedoraHomeFooter.svelte';
	import PricingPlans from '$lib/component/own/local/public/home/PricingPlans.svelte';
	import PricingTrialRequest from '$lib/component/own/local/public/home/PricingTrialRequest.svelte';
	import PricingAudienceFaq from '$lib/component/own/local/public/home/PricingAudienceFaq.svelte';
	import { m } from '$lib/paraglide/messages';
	import {
		CLOUD_MONTHLY_USD,
		onpremMonthlyUsd
	} from '$lib/tool/pricing';

	let { data, form } = $props();

	const title = $derived(m.pricing_seo_title());
	const description = $derived(m.pricing_seo_description());
	const canonical = $derived(`${data.origin.replace(/\/$/, '')}/pricing`);
	const ogImage = $derived(`${data.origin.replace(/\/$/, '')}/og-medora.svg`);

	const onpremStarter = onpremMonthlyUsd(CLOUD_MONTHLY_USD.starter);
	const onpremBusiness = onpremMonthlyUsd(CLOUD_MONTHLY_USD.business);
	const onpremScale = onpremMonthlyUsd(CLOUD_MONTHLY_USD.scale);

	const jsonLd = $derived(
		JSON.stringify([
			{
				'@context': 'https://schema.org',
				'@type': 'WebPage',
				name: title,
				description,
				url: canonical,
				isPartOf: {
					'@type': 'WebSite',
					name: m.menzies_medora(),
					url: data.origin.replace(/\/$/, '')
				}
			},
			{
				'@context': 'https://schema.org',
				'@type': 'SoftwareApplication',
				name: m.menzies_medora(),
				applicationCategory: 'HealthApplication',
				operatingSystem: 'Web',
				url: canonical,
				description,
				offers: [
					{
						'@type': 'Offer',
						name: `Cloud ${m.pricing_plan_starter_name()}`,
						price: String(CLOUD_MONTHLY_USD.starter),
						priceCurrency: 'USD'
					},
					{
						'@type': 'Offer',
						name: `Cloud ${m.pricing_plan_business_name()}`,
						price: String(CLOUD_MONTHLY_USD.business),
						priceCurrency: 'USD'
					},
					{
						'@type': 'Offer',
						name: `Cloud ${m.pricing_plan_scale_name()}`,
						price: String(CLOUD_MONTHLY_USD.scale),
						priceCurrency: 'USD'
					},
					{
						'@type': 'Offer',
						name: `On-premise ${m.pricing_plan_starter_name()}`,
						price: String(onpremStarter),
						priceCurrency: 'USD'
					},
					{
						'@type': 'Offer',
						name: `On-premise ${m.pricing_plan_business_name()}`,
						price: String(onpremBusiness),
						priceCurrency: 'USD'
					},
					{
						'@type': 'Offer',
						name: `On-premise ${m.pricing_plan_scale_name()}`,
						price: String(onpremScale),
						priceCurrency: 'USD'
					}
				]
			}
		])
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
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
		<PricingPlans />
		<PricingTrialRequest {form} />
		<PricingAudienceFaq />
	</main>
	<MedoraHomeFooter />
</div>
