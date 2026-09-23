<script lang="ts">
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { OperativeNoteRow } from '$lib/model/type/medora/clinical.type';
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
		`/api/medora/hospital/${hospitalId}/home/consultation/operative-notes`
	);
	let rows = $state<OperativeNoteRow[]>([]);
	let editingId = $state<number | null>(null);
	let preOp = $state('');
	let findings = $state('');
	let technique = $state('');
	let bloodLoss = $state('');
	let specimens = $state('');
	let postOp = $state('');
	let isBusy = $state(false);
	let errorMessage = $state('');

	function resetForm() {
		editingId = null;
		preOp = '';
		findings = '';
		technique = '';
		bloodLoss = '';
		specimens = '';
		postOp = '';
	}

	function edit(row: OperativeNoteRow) {
		editingId = row.id;
		preOp = row.preOp;
		findings = row.findings;
		technique = row.technique;
		bloodLoss = row.bloodLoss ?? '';
		specimens = row.specimens;
		postOp = row.postOp;
	}

	async function loadRows() {
		if (!hospitalId || !visitId) return;
		isBusy = true;
		errorMessage = '';
		try {
			const response = await fetch(`${apiBase}?visitId=${visitId}`);
			if (!response.ok) throw new Error(await response.text());
			rows = (await response.json()) as OperativeNoteRow[];
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: m.mo_clinical_operative_load_failed();
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
		isBusy = true;
		try {
			await post({
				id: editingId,
				visitId,
				preOp,
				findings,
				technique,
				bloodLoss: bloodLoss.trim() || null,
				specimens,
				postOp
			});
			resetForm();
			await loadRows();
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: m.mo_clinical_operative_save_failed();
		} finally {
			isBusy = false;
		}
	}

	async function remove(id: number) {
		if (!confirm(m.mo_clinical_operative_delete_confirm())) return;
		isBusy = true;
		try {
			await post({ action: 'delete', id });
			if (editingId === id) resetForm();
			await loadRows();
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: m.mo_clinical_operative_delete_failed();
		} finally {
			isBusy = false;
		}
	}

	onMount(() => {
		void loadRows();
	});
</script>

<svelte:head
	><title>{m.mo_clinical_operative_title()}</title></svelte:head
>

<div class="flex max-w-6xl flex-col gap-4">
	<h1 class="text-xl font-semibold">
		{m.mo_clinical_operative_title()}
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
				<label class="flex flex-col gap-1 text-sm"
					><span>{m.mo_clinical_pre_op_diagnosis()}</span
					><WashTextarea bind:value={preOp} /></label
				>
				<label class="flex flex-col gap-1 text-sm"
					><span>{m.mo_clinical_post_op_diagnosis()}</span
					><WashTextarea bind:value={postOp} /></label
				>
				<label class="flex flex-col gap-1 text-sm"
					><span>{m.mo_clinical_findings()}</span><WashTextarea
						bind:value={findings}
					/></label
				>
				<label class="flex flex-col gap-1 text-sm"
					><span>{m.mo_clinical_technique()}</span><WashTextarea
						bind:value={technique}
					/></label
				>
				<label class="flex flex-col gap-1 text-sm"
					><span>{m.mo_clinical_specimens()}</span><WashTextarea
						bind:value={specimens}
					/></label
				>
				<label class="flex flex-col gap-1 text-sm">
					<span>{m.mo_clinical_blood_loss()}</span>
					<WashInputField
						bind:value={bloodLoss}
						inputType="text"
						inputPlaceholderText={m.mo_clinical_optional()}
					/>
				</label>
				<div class="flex justify-end gap-2 md:col-span-2">
					{#if editingId}<WashButton
							className="btn-ghost"
							onClick={resetForm}>{m.mo_clinical_cancel()}</WashButton
						>{/if}
					<WashButton
						className="btn-primary"
						onClick={save}
						disabled={isBusy}>{m.mo_clinical_save_note()}</WashButton
					>
				</div>
			</div>
		</section>
		<ul class="flex flex-col gap-2">
			{#each rows as row (row.id)}
				<li class="rounded-box border border-base-300 p-3">
					<div class="flex items-start justify-between gap-3">
						<div class="grid flex-1 gap-2 text-sm md:grid-cols-2">
							<div>
								<span class="font-medium"
									>{m.mo_clinical_pre_op_short()}</span
								>
								{row.preOp || '–'}
							</div>
							<div>
								<span class="font-medium"
									>{m.mo_clinical_post_op_short()}</span
								>
								{row.postOp || '–'}
							</div>
							<div>
								<span class="font-medium"
									>{m.mo_clinical_findings_short()}</span
								>
								{row.findings || '–'}
							</div>
							<div>
								<span class="font-medium"
									>{m.mo_clinical_technique_short()}</span
								>
								{row.technique || '–'}
							</div>
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
