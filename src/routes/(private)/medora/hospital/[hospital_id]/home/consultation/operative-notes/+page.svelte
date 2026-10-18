<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { parseUuid } from '$lib/util/id.util';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(
		parseUuid(page.url.searchParams.get('visitId') ?? '') ??
			parseUuid(String(VisitState.visitId ?? '')) ??
			''
	);

	lifeCycle.onMount(() => {
		if (hospitalId && visitId) {
			void goto(
				`/medora/hospital/${hospitalId}/home/perioperative/cases?visitId=${visitId}`
			);
		}
	});
</script>

<p class="p-4 text-sm opacity-80">{msg.periop_operative_notes_redirect()}</p>
