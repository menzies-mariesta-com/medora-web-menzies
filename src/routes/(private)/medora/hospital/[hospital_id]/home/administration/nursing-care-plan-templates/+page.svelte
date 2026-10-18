<script lang="ts">
	import { page } from '$app/state';
	import type { NursingCarePlanTemplateRow } from '$lib/model/type/medora/clinical-platform.type';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const api = $derived(
		page.params.hospital_id
			? `/api/medora/hospital/${page.params.hospital_id}/home/administration/clinical-platform`
			: ''
	);
	let rows = $state<NursingCarePlanTemplateRow[]>([]);
	$effect(() => {
		if (api)
			void fetch(`${api}?mode=carePlanTemplate.list`).then(async (r) => {
				rows = (await r.json()) as NursingCarePlanTemplateRow[];
			});
	});
</script>

<h1 class="text-primary mb-4 text-xl font-bold">{msg.clinical_care_plan_templates_title()}</h1>
<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
	<thead><tr><th>Title</th><th>NANDA label</th></tr></thead>
	<tbody>
		{#each rows as row (row.id)}
			<tr><td>{row.title}</td><td>{row.nandaLabel ?? ''}</td></tr>
		{/each}
	</tbody>
</table>
