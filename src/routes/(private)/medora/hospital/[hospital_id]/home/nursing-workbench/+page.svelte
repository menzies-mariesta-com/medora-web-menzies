<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	function goOpd() {
		if (!hospitalId) return;
		void goto(
			`/medora/hospital/${hospitalId}/home/nursing-workbench/emr/patient-visit-history-dashboard`
		);
	}

	function goIpd() {
		if (!hospitalId) return;
		void goto(
			`/medora/hospital/${hospitalId}/home/nursing-workbench/ipd/census`
		);
	}
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-6 p-6">
	<div>
		<h1 class="text-xl font-semibold">Nursing Workbench</h1>
		<p class="mt-1 text-sm opacity-70">
			Choose outpatient nursing (OPD) or inpatient ward census (IPD).
		</p>
	</div>
	<div class="grid gap-4 sm:grid-cols-2">
		<div
			class="flex flex-col gap-3 rounded-box border border-base-300 p-4"
		>
			<h2 class="font-medium">Nursing OPD</h2>
			<p class="text-sm opacity-70">
				Vitals, allergies, orders, and nursing-complete for outpatient
				visits.
			</p>
			<WashButton className="btn-primary" onClick={goOpd}>
				Open OPD dashboard
			</WashButton>
		</div>
		<div
			class="flex flex-col gap-3 rounded-box border border-base-300 p-4"
		>
			<h2 class="font-medium">Nursing IPD</h2>
			<p class="text-sm opacity-70">
				Ward census, bed transfer, discharge, and inpatient nursing
				charting.
			</p>
			<WashButton className="btn-primary" onClick={goIpd}>
				Open IPD census
			</WashButton>
		</div>
	</div>
</div>
