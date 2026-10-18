<script lang="ts">
	import { page } from '$app/state';
	import LabAccessionWorklistTable from '$lib/component/own/local/private/medora/diagnostics/LabAccessionWorklistTable.svelte';
	import type { LabAccessionListRow } from '$lib/model/type/medora/diagnostics.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/diagnostics/lab/receive` : ''
	);
	let rows = $state<LabAccessionListRow[]>([]);
	let busy = $state(false);

	async function load() {
		if (!api) return;
		const res = await fetch(api);
		if (!res.ok) await throwUserFacingHttpError(res);
		rows = (await res.json()) as LabAccessionListRow[];
	}

	async function receive(id: number) {
		busy = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'receive', accessionId: id })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			await load();
		} finally {
			busy = false;
		}
	}

	lifeCycle.onMount(() => void load());
</script>

<svelte:head><title>{msg.diagnostics_receive_title()}</title></svelte:head>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
	<h1 class="text-primary text-xl font-bold">{msg.diagnostics_receive_title()}</h1>
	<LabAccessionWorklistTable {rows} {busy} mode="receive" onReceive={receive} />
</div>
