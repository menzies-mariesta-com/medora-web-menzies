<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import type { ConsultationWorkspaceRow } from '$lib/model/type/medora/clinical.type';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { m } from '$lib/paraglide/messages';

	const hospitalId = $derived(page.params.hospital_id ?? '');
	let rows = $state<ConsultationWorkspaceRow[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');

	function formatDate(value: string | null): string {
		return value ? new Date(value).toLocaleString() : '–';
	}

	async function loadWorkspace() {
		if (!hospitalId) return;
		isLoading = true;
		errorMessage = '';
		try {
			const response = await fetch(
				`/api/medora/hospital/${hospitalId}/home/consultation`
			);
			if (!response.ok) throw new Error(await response.text());
			rows = (await response.json()) as ConsultationWorkspaceRow[];
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: m.mo_clinical_workspace_load_failed();
		} finally {
			isLoading = false;
		}
	}

	function selectVisit(row: ConsultationWorkspaceRow) {
		VisitState.select({
			visitId: row.visitId,
			patientName: row.patientName
		});
	}

	onMount(() => {
		void loadWorkspace();
	});
</script>

<svelte:head
	><title>{m.mo_clinical_workspace_title()}</title></svelte:head
>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between gap-3">
		<div>
			<h1 class="text-xl font-semibold">
				{m.mo_clinical_workspace_title()}
			</h1>
			<p class="text-sm opacity-70">
				{m.mo_clinical_workspace_subtitle()}
			</p>
		</div>
		<WashButton
			className="btn-outline btn-sm"
			onClick={loadWorkspace}
			disabled={isLoading}
		>
			{m.mo_clinical_refresh()}
		</WashButton>
	</div>

	{#if errorMessage}
		<WashAlert type={StatusColorEnum.ERROR} message={errorMessage} />
	{:else if isLoading}
		<p class="text-sm opacity-70">
			{m.mo_clinical_loading_patients()}
		</p>
	{:else if rows.length === 0}
		<WashAlert
			type={StatusColorEnum.INFO}
			message={m.mo_clinical_workspace_empty()}
		/>
	{:else}
		<div class="rounded-box overflow-x-auto border border-base-300">
			<table class="table-zebra table">
				<thead>
					<tr>
						<th>{m.mo_clinical_patient()}</th>
						<th>{m.mo_clinical_visit()}</th>
						<th>{m.mo_clinical_admission()}</th>
						<th>{m.mo_clinical_ward_bed()}</th>
						<th>{m.mo_clinical_admitted()}</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.admissionId)}
						<tr>
							<td>
								<div class="font-medium">{row.patientName}</div>
								<div class="text-xs opacity-60">{row.patientId}</div>
							</td>
							<td>{row.visitNo ?? row.visitId}</td>
							<td>{row.admissionNo}</td>
							<td>{row.wardName ?? '–'} / {row.bedName ?? '–'}</td>
							<td>{formatDate(row.admittedAt)}</td>
							<td class="text-right">
								<form
									method="GET"
									action={resolve(
										`/medora/hospital/${hospitalId}/home/consultation/emr`
									)}
									onsubmit={() => selectVisit(row)}
								>
									<input
										type="hidden"
										name="visitId"
										value={row.visitId}
									/>
									<button
										type="submit"
										class="btn btn-primary btn-sm"
									>
										{m.mo_clinical_open_emr()}
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
