<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import type { RoiRequestRow } from '$lib/model/type/medora/clinical-platform.type';
	import { parseUuid } from '$lib/util/id.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const api = $derived(
		page.params.hospital_id
			? `/api/medora/hospital/${page.params.hospital_id}/home/medical-records/roi`
			: ''
	);
	let rows = $state<RoiRequestRow[]>([]);
	let patientId = $state('');
	let requesterName = $state('');
	let scope = $state('');
	let isSaving = $state(false);

	async function load() {
		rows = (await fetch(api).then((r) => r.json())) as RoiRequestRow[];
	}

	async function create() {
		const pid = parseUuid(patientId);
		if (!pid || !requesterName.trim() || !scope.trim()) return;
		isSaving = true;
		try {
			await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'create',
					patientId: pid,
					requesterName,
					scopeDescription: scope
				})
			});
			await load();
		} finally {
			isSaving = false;
		}
	}

	$effect(() => {
		if (api) void load();
	});
</script>

<h1 class="text-primary mb-4 text-xl font-bold">{msg.clinical_roi_title()}</h1>
<div class="card bg-base-100 mb-4 border p-4">
	<h2 class="card-title text-primary mb-2 font-bold">New request</h2>
	<WashInputField className="input-sm mb-2" bind:value={patientId} placeholder="Patient UUID" />
	<WashInputField className="input-sm mb-2" bind:value={requesterName} placeholder="Requester" />
	<WashTextarea className="textarea-sm mb-2" bind:value={scope} placeholder="Scope" />
	<WashButton
		type="button"
		className="btn-primary cursor-pointer"
		loading={isSaving}
		disabled={isSaving}
		onclick={() => create()}>{msg.clinical_save()}</WashButton
	>
</div>
<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
	<thead><tr><th>Requester</th><th>Status</th><th>Due</th></tr></thead>
	<tbody>
		{#each rows as row (row.id)}
			<tr>
				<td>{row.requesterName}</td>
				<td>{row.requestStatus}</td>
				<td>{row.dueDate ?? ''}</td>
			</tr>
		{/each}
	</tbody>
</table>
