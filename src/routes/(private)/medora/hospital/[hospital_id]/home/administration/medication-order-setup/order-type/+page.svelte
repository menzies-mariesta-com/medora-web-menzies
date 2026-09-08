<script lang="ts">
	import MedOrderMasterCrud from '$lib/component/own/local/private/medora/medication-order/MedOrderMasterCrud.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<MedOrderMasterCrud
	setupSegment="order-type"
	title={m.med_order_setup_order_type_title()}
	variant="simple"
/>
