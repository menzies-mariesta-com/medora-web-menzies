<script lang="ts">
	import { page } from '$app/state';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId ? `/api/medora/hospital/${hospitalId}/home/obstetrics` : ''
	);

	type LdRow = {
		encounter: { visitId: string; boardColumn: string };
		visitNo: string | null;
		patientName: string | null;
	};

	let rows = $state<LdRow[]>([]);

	async function load() {
		const res = await fetch(api);
		if (!res.ok) await throwUserFacingHttpError(res);
		rows = (await res.json()) as LdRow[];
	}

	lifeCycle.onMount(() => void load());
</script>

<div class="flex flex-col gap-3 p-4">
	<h1 class="text-primary text-lg font-bold">{msg.ld_labor_board_title()}</h1>
	<div class="grid gap-3 md:grid-cols-2">
		{#each rows as row (row.encounter.visitId)}
			<a
				class="hover:bg-primary/20 cursor-pointer rounded-box border border-base-300 p-3"
				href={`/medora/hospital/${hospitalId}/home/obstetrics/partogram?visitId=${row.encounter.visitId}`}
			>
				<p class="font-medium">{row.patientName}</p>
				<p class="text-xs">{row.visitNo}</p>
				<p class="text-xs opacity-70">{row.encounter.boardColumn}</p>
			</a>
		{/each}
	</div>
</div>
