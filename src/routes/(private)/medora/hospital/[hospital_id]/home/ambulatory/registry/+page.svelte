<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type { RegistryDefinitionRow } from '$lib/model/type/medora/clinical-platform.type';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const api = $derived(
		page.params.hospital_id
			? `/api/medora/hospital/${page.params.hospital_id}/home/ambulatory/registry`
			: ''
	);
	let defs = $state<RegistryDefinitionRow[]>([]);

	async function load() {
		defs = (await fetch(`${api}?mode=definitions`).then((r) =>
			r.json()
		)) as RegistryDefinitionRow[];
	}

	async function seed() {
		await fetch(api, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ mode: 'seedDefaults' })
		});
		await load();
	}

	$effect(() => {
		if (api) void load();
	});
</script>

<h1 class="text-primary mb-4 text-xl font-bold">{msg.clinical_registry_title()}</h1>
<WashButton type="button" className="btn-sm btn-secondary mb-4 cursor-pointer" onclick={() => seed()}
	>Seed DM / HTN / HIV registries</WashButton
>
<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
	<thead><tr><th>Code</th><th>Name</th><th>Recall days</th></tr></thead>
	<tbody>
		{#each defs as row (row.id)}
			<tr>
				<td>{row.code}</td>
				<td>{row.name}</td>
				<td>{row.recallIntervalDays}</td>
			</tr>
		{/each}
	</tbody>
</table>
