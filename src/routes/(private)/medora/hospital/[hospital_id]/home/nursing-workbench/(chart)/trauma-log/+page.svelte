<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type { TraumaActivationRow } from '$lib/model/type/medora/ed-workbench.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(page.url.searchParams.get('visitId') ?? '');
	const apiBase = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/emergency` : ''
	);

	let rows = $state<TraumaActivationRow[]>([]);
	let level = $state('II');
	let submitting = $state(false);

	async function load() {
		const res = await fetch(`${apiBase}?mode=trauma`);
		if (!res.ok) await throwUserFacingHttpError(res);
		rows = (await res.json()) as TraumaActivationRow[];
	}

	async function activate() {
		if (!visitId) return;
		submitting = true;
		try {
			await fetch(apiBase, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'trauma_activate',
					visitId,
					levelCode: level,
					valuesJson: { activated_from: 'trauma_log' }
				})
			});
			await load();
		} finally {
			submitting = false;
		}
	}

	lifeCycle.onMount(() => void load());
</script>

<div class="flex flex-col gap-4 p-4">
	<h1 class="text-error text-lg font-bold">{msg.ed_trauma_log_title()}</h1>
	{#if visitId}
		<div class="flex flex-wrap items-end gap-2">
			<label class="form-control max-w-xs" for="trauma-level">
				<span class="label-text">{msg.ed_trauma_level()}</span>
				<select id="trauma-level" class="select select-sm" bind:value={level}>
					<option value="I">Level I</option>
					<option value="II">Level II</option>
					<option value="III">Level III</option>
				</select>
			</label>
			<WashButton
				className="btn-error cursor-pointer"
				loading={submitting}
				disabled={submitting}
				onClick={activate}
			>
				{msg.ed_trauma_activate()}
			</WashButton>
		</div>
	{:else}
		<p class="text-sm opacity-70">{msg.ed_trauma_visit_hint()}</p>
	{/if}
	<div class="overflow-x-auto">
		<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
			<thead>
				<tr>
					<th>{msg.ed_trauma_col_visit()}</th>
					<th>{msg.ed_trauma_col_level()}</th>
					<th>{msg.ed_trauma_col_time()}</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.id)}
					<tr>
						<td>{row.visitId}</td>
						<td>{row.levelCode}</td>
						<td>{row.activatedAt}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
