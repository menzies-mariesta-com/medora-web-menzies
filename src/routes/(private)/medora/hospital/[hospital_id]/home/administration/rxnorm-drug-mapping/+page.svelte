<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/clinical-platform`
			: ''
	);

	type Row = {
		id: number;
		itemName: string;
		rxnormRxcui: string | null;
	};
	type Hit = { rxcui: string; name: string; tty: string };

	let rows = $state<Row[]>([]);
	let search = $state('');
	let rxSearch = $state('');
	let rxHits = $state<Hit[]>([]);
	let selectedItemId = $state<number | null>(null);
	let ingredientPreview = $state<Hit[]>([]);
	let mappingBusy = $state(false);

	async function load() {
		const qs = new URLSearchParams({ mode: 'rxnorm.items', search });
		const res = await fetch(`${api}?${qs}`);
		rows = (await res.json()) as Row[];
	}

	async function searchRxnorm() {
		const qs = new URLSearchParams({ mode: 'rxnorm.search', q: rxSearch, limit: '30' });
		rxHits = (await fetch(`${api}?${qs}`).then((r) => r.json())) as Hit[];
	}

	async function loadIngredients(rxcui: string) {
		const qs = new URLSearchParams({ mode: 'rxnorm.ingredients', rxcui });
		ingredientPreview = (await fetch(`${api}?${qs}`).then((r) => r.json())) as Hit[];
	}

	async function map(rxcui: string) {
		if (selectedItemId == null || mappingBusy) return;
		mappingBusy = true;
		try {
			await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'rxnorm.setItemMapping',
					itemMasterId: selectedItemId,
					rxnormRxcui: rxcui
				})
			});
			await load();
			await loadIngredients(rxcui);
		} finally {
			mappingBusy = false;
		}
	}

	$effect(() => {
		if (api) void load();
	});
</script>

<h1 class="text-primary mb-4 text-xl font-bold">{msg.clinical_rxnorm_mapping_title()}</h1>
<p class="text-base-content/70 mb-4 text-sm">{msg.clinical_rxnorm_mapping_help()}</p>
<WashInputField
	className="input-sm mb-2"
	bind:value={search}
	placeholder={msg.clinical_rxnorm_mapping_search_items()}
	onchange={() => load()}
/>
<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
	<thead>
		<tr>
			<th>{msg.clinical_rxnorm_mapping_col_item()}</th>
			<th>{msg.clinical_rxnorm_mapping_col_rxcui()}</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each rows as row (row.id)}
			<tr>
				<td>{row.itemName}</td>
				<td>{row.rxnormRxcui ?? ''}</td>
				<td>
					<WashButton
						type="button"
						className="btn-xs cursor-pointer"
						onclick={() => {
							selectedItemId = row.id;
							if (row.rxnormRxcui) void loadIngredients(row.rxnormRxcui);
						}}>{msg.clinical_rxnorm_mapping_map()}</WashButton
					>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
{#if selectedItemId}
	<div class="mt-4 flex flex-wrap gap-2">
		<WashInputField
			bind:value={rxSearch}
			placeholder={msg.clinical_rxnorm_mapping_search_rxnorm()}
		/>
		<WashButton
			type="button"
			className="btn-sm cursor-pointer"
			onclick={() => searchRxnorm()}>{msg.clinical_rxnorm_mapping_search()}</WashButton
		>
	</div>
	<ul class="mt-2 space-y-1">
		{#each rxHits as hit (hit.rxcui)}
			<li>
				<button
					type="button"
					class="link cursor-pointer"
					class:cursor-not-allowed={mappingBusy}
					disabled={mappingBusy}
					onclick={() => map(hit.rxcui)}
					>{hit.name} ({hit.tty}, {hit.rxcui})</button
				>
			</li>
		{/each}
	</ul>
	{#if ingredientPreview.length}
		<div class="mt-4">
			<h2 class="text-secondary font-bold">{msg.clinical_rxnorm_mapping_ingredients()}</h2>
			<ul class="list-disc pl-6">
				{#each ingredientPreview as ing (ing.rxcui)}
					<li>{ing.name} ({ing.tty}, {ing.rxcui})</li>
				{/each}
			</ul>
		</div>
	{/if}
{/if}
