<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import LabAccessionWorklistTable from '$lib/component/own/local/private/medora/diagnostics/LabAccessionWorklistTable.svelte';
	import type { LabAccessionListRow } from '$lib/model/type/medora/diagnostics.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const section = $derived(page.params.section ?? 'chemistry');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/diagnostics/lab/worklist?section=${section}`
			: ''
	);
	let rows = $state<LabAccessionListRow[]>([]);
	let busy = $state(false);

	async function load() {
		if (!api) return;
		const res = await fetch(api);
		if (!res.ok) await throwUserFacingHttpError(res);
		rows = (await res.json()) as LabAccessionListRow[];
	}

	async function startProcessing(id: number) {
		busy = true;
		try {
			const receiveApi = `/api/medora/hospital/${hospitalId}/home/diagnostics/lab/receive`;
			const res = await fetch(receiveApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'startProcessing', accessionId: id })
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			await load();
		} finally {
			busy = false;
		}
	}

	function openResults(id: number) {
		void goto(
			`/medora/hospital/${hospitalId}/home/diagnostics/lab/results?accessionId=${id}`
		);
	}

	lifeCycle.onMount(() => void load());
</script>

<svelte:head><title>{msg.diagnostics_section_worklist_title()} – {section}</title></svelte:head>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
	<h1 class="text-primary text-xl font-bold">
		{msg.diagnostics_section_worklist_title()}: {section}
	</h1>
	<LabAccessionWorklistTable
		{rows}
		{busy}
		mode="bench"
		onStartProcessing={startProcessing}
		onOpenResults={openResults}
	/>
</div>
