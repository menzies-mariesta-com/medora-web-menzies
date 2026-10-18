<script lang="ts">
	import { page } from '$app/state';
	import type { PharmacyProductIdentifierRow } from '$lib/model/type/medora/clinical-platform.type';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const api = $derived(
		page.params.hospital_id
			? `/api/medora/hospital/${page.params.hospital_id}/home/administration/clinical-platform`
			: ''
	);
	let rows = $state<PharmacyProductIdentifierRow[]>([]);
	$effect(() => {
		if (api)
			void fetch(`${api}?mode=productIdentifier.list`).then(async (r) => {
				rows = (await r.json()) as PharmacyProductIdentifierRow[];
			});
	});
</script>

<h1 class="text-primary mb-4 text-xl font-bold">{msg.clinical_product_barcode_title()}</h1>
<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
	<thead><tr><th>Item</th><th>Barcode</th><th>Type</th></tr></thead>
	<tbody>
		{#each rows as row (row.id)}
			<tr>
				<td>{row.itemName}</td>
				<td>{row.barcodeValue}</td>
				<td>{row.identifierType}</td>
			</tr>
		{/each}
	</tbody>
</table>
