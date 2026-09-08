<script lang="ts">
	import MedOrderMasterCrud from '$lib/component/own/local/private/medora/medication-order/MedOrderMasterCrud.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<MedOrderMasterCrud
	setupSegment="route"
	title={m.med_order_setup_route_title()}
	variant="simple"
/>
