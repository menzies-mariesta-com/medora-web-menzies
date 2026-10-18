<script lang="ts">
	import { page } from '$app/state';
	import { parseUuid } from '$lib/util/id.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const api = $derived(
		page.params.hospital_id
			? `/api/medora/hospital/${page.params.hospital_id}/home/ambulatory/immunization`
			: ''
	);
	const patientId = $derived(parseUuid(page.url.searchParams.get('patientId') ?? '') ?? '');

	type Imm = { id: number; vaccineName?: string; administeredOn: string; doseSequence: number };
	type Due = { masterId: number; name: string; nextDose: number };

	let history = $state<Imm[]>([]);
	let due = $state<Due[]>([]);

	$effect(() => {
		if (!api || !patientId) return;
		void fetch(`${api}?mode=patient.list&patientId=${patientId}`).then(async (r) => {
			history = (await r.json()) as Imm[];
		});
		void fetch(`${api}?mode=patient.due&patientId=${patientId}`).then(async (r) => {
			due = (await r.json()) as Due[];
		});
	});
</script>

<h1 class="text-primary mb-4 text-xl font-bold">{msg.clinical_immunization_title()}</h1>
{#if !patientId}
	<p class="text-sm">Open with ?patientId=</p>
{:else}
	<h2 class="font-bold">Due</h2>
	<ul class="mb-4 list-disc pl-6">
		{#each due as d (d.masterId)}
			<li>{d.name} dose {d.nextDose}</li>
		{/each}
	</ul>
	<h2 class="font-bold">History</h2>
	<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
		<thead><tr><th>Vaccine</th><th>Date</th><th>Dose</th></tr></thead>
		<tbody>
			{#each history as row (row.id)}
				<tr>
					<td>{row.vaccineName}</td>
					<td>{row.administeredOn}</td>
					<td>{row.doseSequence}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
