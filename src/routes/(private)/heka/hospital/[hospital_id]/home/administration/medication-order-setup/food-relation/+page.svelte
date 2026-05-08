<script lang="ts">
	import MedOrderMasterCrud from '$lib/component/own/local/private/heka/medication-order/MedOrderMasterCrud.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

<MedOrderMasterCrud
	setupSegment="food-relation"
	title={m.med_order_setup_food_relation_title()}
	variant="simple"
/>
