<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type {
		ClinicalAlertRow,
		CosignWorkItemRow
	} from '$lib/model/type/medora/clinical-platform.type';
	import { m } from '$lib/paraglide/messages';
	import { goto } from '$app/navigation';

	const msg = m as Record<string, (inputs?: object) => string>;
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const apiBase = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/clinical-tasks` : ''
	);

	type CriticalRow = {
		id: number;
		patientName: string;
		testName: string;
		resultValue: string;
	};

	let tab = $state<'alerts' | 'cosign' | 'critical'>('alerts');
	let alerts = $state<ClinicalAlertRow[]>([]);
	let cosignItems = $state<CosignWorkItemRow[]>([]);
	let criticalRows = $state<CriticalRow[]>([]);

	async function load() {
		if (!apiBase) return;
		const [a, c, cr] = await Promise.all([
			fetch(`${apiBase}?mode=alerts.open`).then((r) => r.json()),
			fetch(`${apiBase}?mode=cosign.pending`).then((r) => r.json()),
			fetch(`${apiBase}?mode=criticalCallbacks.open`).then((r) => r.json())
		]);
		alerts = a as ClinicalAlertRow[];
		cosignItems = c as CosignWorkItemRow[];
		criticalRows = cr as CriticalRow[];
	}

	async function ack(id: number) {
		await fetch(apiBase, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ mode: 'alerts.acknowledge', alertId: id })
		});
		await load();
	}

	$effect(() => {
		if (apiBase) void load();
	});
</script>

<div class="flex flex-col gap-4 p-2">
	<h1 class="text-primary text-xl font-bold">{msg.clinical_tasks_title()}</h1>
	<div class="tabs tabs-boxed w-fit">
		<button
			type="button"
			class="tab cursor-pointer"
			class:tab-active={tab === 'alerts'}
			onclick={() => (tab = 'alerts')}
		>
			{msg.clinical_tasks_alerts()} ({alerts.length})
		</button>
		<button
			type="button"
			class="tab cursor-pointer"
			class:tab-active={tab === 'cosign'}
			onclick={() => (tab = 'cosign')}
		>
			{msg.clinical_tasks_cosign()} ({cosignItems.length})
		</button>
		<button
			type="button"
			class="tab cursor-pointer"
			class:tab-active={tab === 'critical'}
			onclick={() => (tab = 'critical')}
		>
			{msg.clinical_tasks_critical_callbacks()} ({criticalRows.length})
		</button>
	</div>
	{#if tab === 'critical'}
		<WashButton
			type="button"
			className="btn-primary btn-sm cursor-pointer w-fit"
			onclick={() =>
				void goto(
					`/medora/hospital/${hospitalId}/home/diagnostics/lab/critical-callback`
				)}
		>
			{msg.diagnostics_critical_callback_title()}
		</WashButton>
		<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
			<thead>
				<tr>
					<th>{msg.diagnostics_col_patient()}</th>
					<th>{msg.diagnostics_col_test()}</th>
					<th>{msg.mo_clinical_result()}</th>
				</tr>
			</thead>
			<tbody>
				{#each criticalRows as row (row.id)}
					<tr>
						<td>{row.patientName}</td>
						<td>{row.testName}</td>
						<td>{row.resultValue}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else if tab === 'alerts'}
		<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
			<thead>
				<tr>
					<th>Actions</th>
					<th>Title</th>
					<th>Severity</th>
				</tr>
			</thead>
			<tbody>
				{#each alerts as row (row.id)}
					<tr>
						<td>
							<WashButton
								type="button"
								className="btn-xs btn-primary cursor-pointer"
								onclick={() => void ack(row.id)}
							>
								{msg.clinical_ack_alert()}
							</WashButton>
						</td>
						<td>{row.title}</td>
						<td>{row.severity}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
			<thead>
				<tr>
					<th>Actions</th>
					<th>Item</th>
					<th>Type</th>
				</tr>
			</thead>
			<tbody>
				{#each cosignItems as row (`${row.workType}-${row.entityId}`)}
					<tr>
						<td>
							<WashButton
								type="button"
								className="btn-xs btn-secondary cursor-pointer"
								onclick={() => void goto(row.deepLink)}
							>
								Open
							</WashButton>
						</td>
						<td>{row.title}</td>
						<td>{row.workType}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
