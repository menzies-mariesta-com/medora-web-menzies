<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DepartmentConsumptionDetailView from '$lib/component/own/local/private/heka/inventory/department-consumption/DepartmentConsumptionDetailView.svelte';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);
	const consumptionId = $derived(
		typeof page.params.consumption_id === 'string' ? page.params.consumption_id : ''
	);
	const backHref = $derived(
		resolve(
			hekaHospitalPageUrl(
				hospitalId,
				'/heka/home/inventory/department-consumption' as const
			) as any
		)
	);
</script>

<DepartmentConsumptionDetailView {hospitalId} {consumptionId} {backHref} />
