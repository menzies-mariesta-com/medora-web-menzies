<script lang="ts">
	import MedOrderMasterCrud from '$lib/component/own/local/private/heka/medication-order/MedOrderMasterCrud.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<MedOrderMasterCrud
	setupSegment="dose-unit"
	title={m.med_order_setup_dose_unit_title()}
	variant="simple"
/>
