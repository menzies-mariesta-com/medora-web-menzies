<script lang="ts">
	import { page } from '$app/state';
	import { SurgicalCaseStatusTaggingEnum } from '$lib/model/enum/db-link';
	import type { SurgicalCaseListRow } from '$lib/model/type/medora/surgical-case.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycle = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/perioperative/surgical-case`
			: ''
	);

	let rows = $state<SurgicalCaseListRow[]>([]);

	async function load() {
		const res = await fetch(
			`${api}?statusTaggingId=${SurgicalCaseStatusTaggingEnum.SCHEDULED}`
		);
		if (!res.ok) await throwUserFacingHttpError(res);
		rows = (await res.json()) as SurgicalCaseListRow[];
	}

	lifeCycle.onMount(() => void load());
</script>

<div class="flex flex-col gap-3 p-4">
	<h1 class="text-primary text-lg font-bold">{msg.periop_pre_op_worklist()}</h1>
	<div class="overflow-x-auto">
		<table class="table table-zebra [&_tbody_tr]:hover:bg-primary/40">
			<thead>
				<tr>
					<th>{msg.periop_col_procedure()}</th>
					<th>{msg.periop_col_patient()}</th>
					<th>{msg.periop_col_schedule()}</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.id)}
					<tr>
						<td>{row.procedureName}</td>
						<td>{row.patientName}</td>
						<td>{row.scheduledStart ?? '–'}</td>
						<td>
							<a
								class="link link-primary cursor-pointer"
								href={`/medora/hospital/${hospitalId}/home/perioperative/cases?caseId=${row.id}&visitId=${row.visitId}`}
							>
								{msg.periop_open_case()}
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
