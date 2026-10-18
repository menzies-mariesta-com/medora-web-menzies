<script lang="ts">
	import { page } from '$app/state';
	import type { LabIntegrationHealthRow } from '$lib/model/type/medora/diagnostics.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/diagnostics/lab/integration`
			: ''
	);
	let health = $state<LabIntegrationHealthRow | null>(null);

	async function load() {
		if (!api) return;
		const res = await fetch(api);
		const data = (await res.json()) as { health: LabIntegrationHealthRow };
		health = data.health;
	}

	lifeCycle.onMount(() => void load());
</script>

<svelte:head><title>{msg.diagnostics_integration_title()}</title></svelte:head>

<div class="flex flex-col gap-4 p-4">
	<h1 class="text-primary text-xl font-bold">{msg.diagnostics_integration_title()}</h1>
	{#if health}
		<div class="grid gap-3 sm:grid-cols-3">
			<div class="stat rounded-box border border-base-300">
				<div class="stat-title">Pending messages</div>
				<div class="stat-value">{health.pendingCount}</div>
			</div>
			<div class="stat rounded-box border border-base-300">
				<div class="stat-title">Parse errors</div>
				<div class="stat-value text-error">{health.errorCount}</div>
			</div>
			<div class="stat rounded-box border border-base-300">
				<div class="stat-title">Last received</div>
				<div class="stat-value text-sm">{health.lastReceivedAt ?? '–'}</div>
			</div>
		</div>
	{/if}
</div>
