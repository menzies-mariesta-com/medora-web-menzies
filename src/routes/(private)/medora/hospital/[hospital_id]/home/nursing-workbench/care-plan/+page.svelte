<script lang="ts">
	import { page } from '$app/state';
	import { parseUuid } from '$lib/util/id.util';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import type { NursingCarePlanInstanceRow } from '$lib/model/type/medora/clinical-platform.type';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(parseUuid(page.url.searchParams.get('visitId') ?? '') ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/nursing-workbench/care-plan`
			: ''
	);

	let instances = $state<NursingCarePlanInstanceRow[]>([]);
	let content = $state('');
	let isSaving = $state(false);

	async function load() {
		if (!visitId) return;
		instances = (await fetch(`${api}?visitId=${visitId}`).then((r) =>
			r.json()
		)) as NursingCarePlanInstanceRow[];
	}

	$effect(() => {
		if (api && visitId) void load();
	});
</script>

<h1 class="text-primary mb-4 text-xl font-bold">{msg.clinical_care_plan_visit_title()}</h1>
{#if !visitId}
	<p class="text-sm">{msg.ld_visit_required()}</p>
{:else}
	<WashTextarea className="textarea-bordered mb-2 w-full" bind:value={content} />
	<p class="text-sm opacity-70">Pick a template from admin library when creating instances via API.</p>
	<ul class="mt-4">
		{#each instances as inst (inst.id)}
			<li class="border-base-300 mb-2 rounded border p-2">
				Plan #{inst.id}
				{#if inst.signedAt}<span class="text-success text-xs">Signed</span>{/if}
			</li>
		{/each}
	</ul>
{/if}
