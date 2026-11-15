<script lang="ts">
	import PricingPlanCheckout from '$lib/component/own/local/public/home/PricingPlanCheckout.svelte';
	import type { PricingTier } from '$lib/model/enum/plan.enum';

	let {
		tier = null,
		submitUrl = '/api/pricing/trial-request',
		showDuration = true,
		pageTitle = 'Request this plan',
		pageLead = 'Tell us about your hospital. We will confirm pricing and enable your subscription after review.'
	}: {
		tier?: PricingTier | null;
		submitUrl?: string;
		showDuration?: boolean;
		pageTitle?: string;
		pageLead?: string;
	} = $props();
</script>

<PricingPlanCheckout
	sectionId="plan-request"
	headingTag="h1"
	{tier}
	{submitUrl}
	{showDuration}
	{pageTitle}
	{pageLead}
	mode="paid"
/>
