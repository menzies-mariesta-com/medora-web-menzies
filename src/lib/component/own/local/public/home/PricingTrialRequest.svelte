<script lang="ts">
	import PricingPlanCheckout from '$lib/component/own/local/public/home/PricingPlanCheckout.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<PricingPlanCheckout
	sectionId="request-trial"
	headingTag="h2"
	pageTitle={m.pricing_trial_title()}
	pageLead={m.pricing_trial_lead()}
	mode="trial"
	showDuration={true}
	submitUrl="/api/pricing/trial-request"
/>
