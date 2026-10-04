<script lang="ts">
	import MedoraHomeNav from '$lib/component/own/local/public/home/MedoraHomeNav.svelte';
	import MedoraHomeFooter from '$lib/component/own/local/public/home/MedoraHomeFooter.svelte';
	import PricingPlans from '$lib/component/own/local/public/home/PricingPlans.svelte';
	import PricingTrialRequest from '$lib/component/own/local/public/home/PricingTrialRequest.svelte';
	import PricingAudienceFaq from '$lib/component/own/local/public/home/PricingAudienceFaq.svelte';
	import SeoHead from '$lib/component/own/snippet/seo/SeoHead.svelte';
	import { m } from '$lib/paraglide/messages';
	import {
		CLOUD_MONTHLY_USD,
		onpremMonthlyUsd
	} from '$lib/tool/pricing';
	import { absoluteAssetUrl, absoluteUrl } from '$lib/util/seo.util';

	let { data, form } = $props();

	const title = $derived(m.pricing_seo_title());
	const description = $derived(m.pricing_seo_description());
	const siteName = $derived(m.menzies_medora());
	const canonical = $derived(absoluteUrl(data.origin, '/pricing'));
	const ogImage = $derived(absoluteAssetUrl(data.origin));

	const onpremStarter = onpremMonthlyUsd(CLOUD_MONTHLY_USD.starter);
	const onpremBusiness = onpremMonthlyUsd(CLOUD_MONTHLY_USD.business);
	const onpremScale = onpremMonthlyUsd(CLOUD_MONTHLY_USD.scale);

	const jsonLd = $derived([
		{
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
		},
		{
			'@context': 'https://schema.org',
			'@type': 'SoftwareApplication',
			name: siteName,
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
		<PricingPlans />
		<PricingTrialRequest {form} />
		<PricingAudienceFaq />
	</main>
	<MedoraHomeFooter />
</div>
