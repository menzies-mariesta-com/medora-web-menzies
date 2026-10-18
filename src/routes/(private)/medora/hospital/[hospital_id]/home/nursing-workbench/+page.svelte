<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	function tr(key: string, fallback: string): string {
		const fn = msg[key];
		return typeof fn === 'function' ? fn() : fallback;
	}

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

	function goEd() {
		if (!hospitalId) return;
		void goto(
			`/medora/hospital/${hospitalId}/home/nursing-workbench/ed/track-board`
		);
	}
</script>

<div class="mx-auto flex max-w-3xl flex-col gap-6 p-6">
	<div>
		<h1 class="text-xl font-semibold">
			{tr('nursing_workbench_hub_title', 'Nursing Workbench')}
		</h1>
		<p class="mt-1 text-sm opacity-70">
			{tr(
				'nursing_workbench_hub_intro',
				'Choose outpatient nursing (OPD), inpatient ward census (IPD), or emergency department nursing (ED).'
			)}
		</p>
	</div>
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<div
			class="flex flex-col gap-3 rounded-box border border-base-300 p-4"
		>
			<h2 class="font-medium">
				{tr('nursing_workbench_hub_opd_title', 'Nursing OPD')}
			</h2>
			<p class="text-sm opacity-70">
				{tr(
					'nursing_workbench_hub_opd_blurb',
					'Vitals, allergies, orders, and nursing-complete for outpatient visits.'
				)}
			</p>
			<WashButton className="btn-primary cursor-pointer" onClick={goOpd}>
				{tr('nursing_workbench_hub_opd_open', 'Open OPD dashboard')}
			</WashButton>
		</div>
		<div
			class="flex flex-col gap-3 rounded-box border border-base-300 p-4"
		>
			<h2 class="font-medium">
				{tr('nursing_workbench_hub_ipd_title', 'Nursing IPD')}
			</h2>
			<p class="text-sm opacity-70">
				{tr(
					'nursing_workbench_hub_ipd_blurb',
					'Ward census, bed transfer, discharge, and inpatient nursing charting.'
				)}
			</p>
			<WashButton className="btn-primary cursor-pointer" onClick={goIpd}>
				{tr('nursing_workbench_hub_ipd_open', 'Open IPD census')}
			</WashButton>
		</div>
		<div
			class="flex flex-col gap-3 rounded-box border border-base-300 p-4 sm:col-span-2 lg:col-span-1"
		>
			<h2 class="font-medium">{tr('nursing_ed_hub_title', 'Nursing ED')}</h2>
			<p class="text-sm opacity-70">
				{tr(
					'nursing_ed_hub_blurb',
					'Track board, triage, trauma log, and nursing charting for emergency visits.'
				)}
			</p>
			<WashButton className="btn-primary cursor-pointer" onClick={goEd}>
				{tr('nursing_ed_hub_open', 'Open ED track board')}
			</WashButton>
		</div>
	</div>
</div>
