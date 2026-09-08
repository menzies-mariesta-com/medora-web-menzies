<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DepartmentConsumptionDetailView from '$lib/component/own/local/private/medora/inventory/department-consumption/DepartmentConsumptionDetailView.svelte';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const consumptionId = $derived(
		typeof page.params.consumption_id === 'string'
			? page.params.consumption_id
			: ''
	);
	const backHref = $derived(
		resolve(
			medoraHospitalPageUrl(
				hospitalId,
				'/medora/home/inventory/department-consumption' as const
			) as any
		)
	);
</script>

<DepartmentConsumptionDetailView
	{hospitalId}
	{consumptionId}
	{backHref}
/>
