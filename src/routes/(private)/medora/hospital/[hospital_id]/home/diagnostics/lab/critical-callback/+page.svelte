<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import type { LabCriticalCallbackRow } from '$lib/model/type/medora/diagnostics.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/diagnostics/lab/critical-callback`
			: ''
	);
	let rows = $state<LabCriticalCallbackRow[]>([]);
	let selectedId = $state<number | null>(null);
	let calledParty = $state('');
	let readBack = $state('');
	let busy = $state(false);

	async function load() {
		if (!api) return;
		const res = await fetch(api);
		if (!res.ok) await throwUserFacingHttpError(res);
		rows = (await res.json()) as LabCriticalCallbackRow[];
	}

	async function complete() {
		if (!selectedId) return;
		busy = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'complete',
					callbackId: selectedId,
					calledParty,
					readBackText: readBack
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			selectedId = null;
			calledParty = '';
			readBack = '';
			await load();
		} finally {
			busy = false;
		}
	}

	lifeCycle.onMount(() => void load());
</script>

<svelte:head><title>{msg.diagnostics_critical_callback_title()}</title></svelte:head>

<div class="flex flex-col gap-4 p-4">
	<h1 class="text-primary text-xl font-bold">{msg.diagnostics_critical_callback_title()}</h1>
	<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
		<thead>
			<tr>
				<th>Actions</th>
				<th>{msg.diagnostics_col_patient()}</th>
				<th>{msg.diagnostics_col_test()}</th>
				<th>{msg.mo_clinical_result()}</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.id)}
				<tr>
					<td>
						<WashButton
							type="button"
							className="btn-primary btn-xs cursor-pointer"
							onClick={() => (selectedId = row.id)}
						>
							Document
						</WashButton>
					</td>
					<td>{row.patientName}</td>
					<td>{row.testName}</td>
					<td>{row.resultValue}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	{#if selectedId}
		<div class="card border border-base-300">
			<div class="card-body gap-3">
				<h2 class="card-title text-secondary font-bold">Callback</h2>
				<label class="form-control">
					<span class="label-text">{msg.diagnostics_called_party()}</span>
					<WashInputField bind:value={calledParty} />
				</label>
				<label class="form-control">
					<span class="label-text">{msg.diagnostics_read_back()}</span>
					<WashTextarea bind:value={readBack} className="min-h-20" />
				</label>
				<WashButton
					type="button"
					className="btn-primary cursor-pointer self-end"
					loading={busy}
					disabled={busy || !calledParty.trim() || !readBack.trim()}
					onClick={() => void complete()}
				>
					{msg.diagnostics_complete_callback()}
				</WashButton>
			</div>
		</div>
	{/if}
</div>
