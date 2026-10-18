<script lang="ts">
	import { page } from '$app/state';
	import type { LabDashboardStats } from '$lib/model/type/medora/diagnostics.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/diagnostics/lab/dashboard`
			: ''
	);
	let stats = $state<LabDashboardStats | null>(null);

	async function load() {
		if (!api) return;
		const res = await fetch(api);
		const data = (await res.json()) as { stats: LabDashboardStats };
		stats = data.stats;
	}

	lifeCycle.onMount(() => void load());
</script>

<svelte:head><title>{msg.diagnostics_lab_dashboard_title()}</title></svelte:head>

<div class="flex flex-col gap-4 p-4">
	<h1 class="text-primary text-xl font-bold">{msg.diagnostics_lab_dashboard_title()}</h1>
	{#if stats}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
			<div class="stat rounded-box border border-base-300">
				<div class="stat-title">{msg.diagnostics_pending_collection()}</div>
				<div class="stat-value text-primary">{stats.pendingCollection}</div>
			</div>
			<div class="stat rounded-box border border-base-300">
				<div class="stat-title">{msg.diagnostics_pending_receive()}</div>
				<div class="stat-value">{stats.pendingReceive}</div>
			</div>
			<div class="stat rounded-box border border-base-300">
				<div class="stat-title">{msg.diagnostics_in_process()}</div>
				<div class="stat-value">{stats.inProcess}</div>
			</div>
			<div class="stat rounded-box border border-base-300">
				<div class="stat-title">{msg.diagnostics_unverified()}</div>
				<div class="stat-value">{stats.unverified}</div>
			</div>
			<div class="stat rounded-box border border-base-300">
				<div class="stat-title">{msg.diagnostics_open_critical()}</div>
				<div class="stat-value text-error">{stats.openCriticalCallbacks}</div>
			</div>
		</div>
	{/if}
</div>
