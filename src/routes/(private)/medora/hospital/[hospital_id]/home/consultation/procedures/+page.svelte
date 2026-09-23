<script lang="ts">
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { ClinicalProcedureRow } from '$lib/model/type/medora/clinical.type';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages';

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(
		Number(
			page.url.searchParams.get('visitId') ?? VisitState.visitId ?? 0
		)
	);
	const apiBase = $derived(
		`/api/medora/hospital/${hospitalId}/home/consultation/procedures`
	);
	let rows = $state<ClinicalProcedureRow[]>([]);
	let editingId = $state<number | null>(null);
	let procedureType = $state('');
	let notes = $state('');
	let performedAt = $state('');
	let isBusy = $state(false);
	let errorMessage = $state('');

	function resetForm() {
		editingId = null;
		procedureType = '';
		notes = '';
		performedAt = '';
	}

	function edit(row: ClinicalProcedureRow) {
		editingId = row.id;
		procedureType = row.procedureType;
		notes = row.notes;
		performedAt = row.performedAt?.slice(0, 16) ?? '';
	}

	async function loadRows() {
		if (!hospitalId || !visitId) return;
		isBusy = true;
		errorMessage = '';
		try {
			const response = await fetch(`${apiBase}?visitId=${visitId}`);
			if (!response.ok) throw new Error(await response.text());
			rows = (await response.json()) as ClinicalProcedureRow[];
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: m.mo_clinical_procedures_load_failed();
		} finally {
			isBusy = false;
		}
	}

	async function post(body: Record<string, unknown>) {
		const response = await fetch(apiBase, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!response.ok) throw new Error(await response.text());
	}

	async function save() {
		if (!procedureType.trim()) return;
		isBusy = true;
		try {
			await post({
				id: editingId,
				visitId,
				procedureType,
				notes,
				performedAt: performedAt
					? new Date(performedAt).toISOString()
					: null
			});
			resetForm();
			await loadRows();
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: m.mo_clinical_procedure_save_failed();
		} finally {
			isBusy = false;
		}
	}

	async function remove(id: number) {
		if (!confirm(m.mo_clinical_procedure_delete_confirm())) return;
		isBusy = true;
		try {
			await post({ action: 'delete', id });
			if (editingId === id) resetForm();
			await loadRows();
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: m.mo_clinical_procedure_delete_failed();
		} finally {
			isBusy = false;
		}
	}

	onMount(() => {
		void loadRows();
	});
</script>

<svelte:head
	><title>{m.mo_clinical_procedures_title()}</title></svelte:head
>

<div class="flex max-w-5xl flex-col gap-4">
	<h1 class="text-xl font-semibold">
		{m.mo_clinical_procedures_title()}
	</h1>
	{#if !visitId}
		<WashAlert
			type={StatusColorEnum.INFO}
			message={m.mo_clinical_select_visit()}
		/>
	{:else}
		{#if errorMessage}<WashAlert
				type={StatusColorEnum.ERROR}
				message={errorMessage}
			/>{/if}
		<section class="card border border-base-300">
			<div class="card-body grid gap-3 p-4 md:grid-cols-2">
				<label class="flex flex-col gap-1 text-sm">
					<span>
						{m.mo_clinical_procedure_type()}
						<span class="text-error">*</span>
					</span>
					<WashInputField
						bind:value={procedureType}
						inputType="text"
						inputPlaceholderText={m.mo_clinical_procedure_placeholder()}
					/>
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span>{m.mo_clinical_performed_at()}</span>
					<WashInputField
						bind:value={performedAt}
						inputType="datetime-local"
					/>
				</label>
				<label class="flex flex-col gap-1 text-sm md:col-span-2">
					<span>{m.mo_clinical_notes()}</span>
					<WashTextarea bind:value={notes} className="min-h-24" />
				</label>
				<div class="flex justify-end gap-2 md:col-span-2">
					{#if editingId}<WashButton
							className="btn-ghost"
							onClick={resetForm}>{m.mo_clinical_cancel()}</WashButton
						>{/if}
					<WashButton
						className="btn-primary"
						onClick={save}
						disabled={isBusy || !procedureType.trim()}
					>
						{editingId
							? m.mo_clinical_update()
							: m.mo_clinical_save()}
					</WashButton>
				</div>
			</div>
		</section>
		<ul class="flex flex-col gap-2">
			{#each rows as row (row.id)}
				<li class="rounded-box border border-base-300 p-3">
					<div class="flex items-start justify-between gap-3">
						<div>
							<div class="font-medium">{row.procedureType}</div>
							<p class="text-sm whitespace-pre-wrap opacity-80">
								{row.notes || m.mo_clinical_no_notes()}
							</p>
						</div>
						<div class="flex gap-1">
							<WashButton
								className="btn-ghost btn-xs"
								onClick={() => edit(row)}
								>{m.mo_clinical_edit()}</WashButton
							>
							<WashButton
								className="btn-ghost btn-xs text-error"
								onClick={() => remove(row.id)}
								>{m.mo_clinical_delete()}</WashButton
							>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
