<script lang="ts">
	import BillingSetupServiceTaggingLinks from '$lib/component/own/local/private/medora/billing/BillingSetupServiceTaggingLinks.svelte';

	let { data } = $props();
</script>

<BillingSetupServiceTaggingLinks
	careSetting="OP"
	apiSegment="op-billing"
	allowedBranches={data?.allowedBranches}
/>
