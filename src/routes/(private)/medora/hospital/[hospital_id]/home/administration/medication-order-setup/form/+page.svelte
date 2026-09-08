<script lang="ts">
	import MedOrderMasterCrud from '$lib/component/own/local/private/medora/medication-order/MedOrderMasterCrud.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<MedOrderMasterCrud
	setupSegment="form"
	title={m.med_order_setup_form_title()}
	variant="simple"
/>
