<script lang="ts">
	import { page } from '$app/state';
	import LabAccessionWorklistTable from '$lib/component/own/local/private/medora/diagnostics/LabAccessionWorklistTable.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import type { LabAccessionListRow } from '$lib/model/type/medora/diagnostics.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/diagnostics/lab/collection-worklist`
			: ''
	);
	let rows = $state<LabAccessionListRow[]>([]);
	let scanValue = $state('');
	let busy = $state(false);

	async function load() {
		if (!api) return;
		const res = await fetch(api);
		if (!res.ok) await throwUserFacingHttpError(res);
		rows = (await res.json()) as LabAccessionListRow[];
	}

	async function collect(id: number) {
		busy = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'collect', accessionId: id })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			await load();
		} finally {
			busy = false;
		}
	}

	async function printLabel(row: LabAccessionListRow) {
		const w = window.open('', '_blank', 'noopener,noreferrer,width=320,height=200');
		if (!w) return;
		w.document.write(
			`<html><body><p>${row.patientName}</p><p>${row.accessionNo}</p><svg id="bc"></svg></body></html>`
		);
		const { default: JsBarcode } = await import('jsbarcode');
		const svg = w.document.getElementById('bc');
		if (svg) {
			JsBarcode(svg, row.barcodePayload, { format: 'CODE128', width: 1.5, height: 48 });
		}
		w.print();
	}

	lifeCycle.onMount(() => void load());
</script>

<svelte:head><title>{msg.diagnostics_collection_worklist_title()}</title></svelte:head>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
	<h1 class="text-primary shrink-0 text-xl font-bold">
		{msg.diagnostics_collection_worklist_title()}
	</h1>
	<div class="flex shrink-0 flex-wrap items-end gap-2">
		<WashInputField
			bind:value={scanValue}
			inputPlaceholderText={msg.diagnostics_scan_barcode()}
			className="min-w-[12rem]"
		/>
		<WashButton
			type="button"
			className="btn-secondary btn-sm cursor-pointer"
			onClick={() => void load()}
		>
			Refresh
		</WashButton>
	</div>
	<LabAccessionWorklistTable {rows} {busy} mode="collection" onCollect={collect} />
	{#each rows as row (row.id)}
		<WashButton
			type="button"
			className="btn-ghost btn-xs cursor-pointer"
			onClick={() => void printLabel(row)}
		>
			{msg.diagnostics_print_label()} {row.accessionNo}
		</WashButton>
	{/each}
</div>
