<script lang="ts">
	import MedOrderMasterCrud from '$lib/component/own/local/private/medora/medication-order/MedOrderMasterCrud.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<MedOrderMasterCrud
	setupSegment="duration"
	title={m.med_order_setup_duration_title()}
	variant="duration"
/>
