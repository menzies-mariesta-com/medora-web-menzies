<script lang="ts">
	import BillingSetupServiceTaggingLinks from '$lib/component/own/local/private/medora/billing/BillingSetupServiceTaggingLinks.svelte';
	import IpdAccommodationBillingPolicyPanel from '$lib/component/own/local/private/medora/billing/IpdAccommodationBillingPolicyPanel.svelte';

	let { data } = $props();
</script>

<IpdAccommodationBillingPolicyPanel />

<BillingSetupServiceTaggingLinks
	careSetting="IP"
	apiSegment="ip-billing"
	allowedBranches={data?.allowedBranches}
/>
