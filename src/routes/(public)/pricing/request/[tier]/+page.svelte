<script lang="ts">
	import MedoraHomeNav from '$lib/component/own/local/public/home/MedoraHomeNav.svelte';
	import MedoraHomeFooter from '$lib/component/own/local/public/home/MedoraHomeFooter.svelte';
	import PricingPlanRequest from '$lib/component/own/local/public/home/PricingPlanRequest.svelte';
	import SeoHead from '$lib/component/own/snippet/seo/SeoHead.svelte';
	import type { PricingTier } from '$lib/model/enum/plan.enum';
	import { absoluteAssetUrl, absoluteUrl } from '$lib/util/seo.util';
	import { m } from '$lib/paraglide/messages';

	let { data } = $props();
	const tier = $derived(data.tier as PricingTier);
	const canonical = $derived(
		absoluteUrl(data.origin, `/pricing/request/${tier}`)
	);
	const ogImage = $derived(absoluteAssetUrl(data.origin));
</script>

<SeoHead
	title={`Request ${tier} plan · Medora`}
	description="Request Medora hospital EMR pricing for your organization. Our team will follow up after you verify your email."
	{canonical}
	{ogImage}
	siteName={m.menzies_medora()}
	robots="noindex,nofollow"
/>

<div class="medora-marketing paper-grain min-h-screen">
	<MedoraHomeNav />
	<main>
		<PricingPlanRequest
			{tier}
			submitUrl="/api/pricing/plan-request"
			showDuration={false}
			pageTitle="Request this plan"
			pageLead="Tell us about your hospital. We will confirm pricing and enable your subscription after review."
		/>
	</main>
	<MedoraHomeFooter />
</div>
