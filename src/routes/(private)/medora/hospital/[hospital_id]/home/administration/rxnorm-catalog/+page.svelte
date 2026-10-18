<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/clinical-platform`
			: ''
	);

	type Status = {
		release: {
			releaseId: string;
			source: string;
			conceptCount: number;
			relCount: number;
			importedAt: string;
		} | null;
		interactionCount: number;
		interactionLatestAt: string | null;
	};

	let status = $state<Status | null>(null);

	async function load() {
		const qs = new URLSearchParams({ mode: 'rxnorm.importStatus' });
		status = (await fetch(`${api}?${qs}`).then((r) => r.json())) as Status;
	}

	$effect(() => {
		if (api) void load();
	});
</script>

<h1 class="text-primary mb-4 text-xl font-bold">{msg.clinical_rxnorm_catalog_title()}</h1>
<p class="text-base-content/70 mb-4 text-sm">{msg.clinical_rxnorm_catalog_cli_help()}</p>
{#if status?.release}
	<div class="stats shadow">
		<div class="stat">
			<div class="stat-title">{msg.clinical_rxnorm_catalog_release()}</div>
			<div class="stat-value text-lg">{status.release.releaseId}</div>
			<div class="stat-desc">{status.release.source}</div>
		</div>
		<div class="stat">
			<div class="stat-title">{msg.clinical_rxnorm_catalog_concepts()}</div>
			<div class="stat-value text-lg">{status.release.conceptCount}</div>
		</div>
		<div class="stat">
			<div class="stat-title">{msg.clinical_rxnorm_catalog_rels()}</div>
			<div class="stat-value text-lg">{status.release.relCount}</div>
		</div>
		<div class="stat">
			<div class="stat-title">{msg.clinical_rxnorm_catalog_interactions()}</div>
			<div class="stat-value text-lg">{status.interactionCount}</div>
			<div class="stat-desc">
				{status.interactionLatestAt
					? msg.clinical_rxnorm_catalog_updated({ at: status.interactionLatestAt })
					: ''}
			</div>
		</div>
	</div>
	<p class="mt-4 text-sm opacity-80">
		{msg.clinical_rxnorm_catalog_imported_at({ at: status.release.importedAt })}
	</p>
{:else}
	<p>{msg.clinical_rxnorm_catalog_empty()}</p>
{/if}
