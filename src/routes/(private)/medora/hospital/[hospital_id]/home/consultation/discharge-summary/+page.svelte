<script lang="ts">
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { DischargeSummaryRow } from '$lib/model/type/medora/clinical.type';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages';

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(
		Number(
			page.url.searchParams.get('visitId') ?? VisitState.visitId ?? 0
		)
	);
	let summary = $state<DischargeSummaryRow | null>(null);
	let hospitalCourse = $state('');
	let dischargeMedications = $state('');
	let followUp = $state('');
	let redFlags = $state('');
	let isLoading = $state(false);
	let isSaving = $state(false);
	let message = $state('');
	let isError = $state(false);

	function fillForm(row: DischargeSummaryRow | null) {
		summary = row;
		hospitalCourse = row?.hospitalCourse ?? '';
		dischargeMedications = row?.dischargeMedications ?? '';
		followUp = row?.followUp ?? '';
		redFlags = row?.redFlags ?? '';
	}

	async function request(
		method: 'GET' | 'POST',
		body?: Record<string, unknown>
	) {
		const url = `/api/medora/hospital/${hospitalId}/home/consultation/discharge-summary`;
		const response = await fetch(
			method === 'GET' ? `${url}?visitId=${visitId}` : url,
			method === 'POST'
				? {
						method,
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify(body)
					}
				: undefined
		);
		if (!response.ok) throw new Error(await response.text());
		return (await response.json()) as DischargeSummaryRow;
	}

	async function loadSummary() {
		if (!hospitalId || !visitId) return;
		isLoading = true;
		message = '';
		try {
			fillForm(await request('GET'));
		} catch (error) {
			isError = true;
			message =
				error instanceof Error
					? error.message
					: m.mo_clinical_discharge_load_failed();
		} finally {
			isLoading = false;
		}
	}

	async function saveSummary() {
		isSaving = true;
		message = '';
		try {
			fillForm(
				await request('POST', {
					visitId,
					hospitalCourse,
					dischargeMedications,
					followUp,
					redFlags
				})
			);
			isError = false;
			message = m.mo_clinical_discharge_saved();
		} catch (error) {
			isError = true;
			message =
				error instanceof Error
					? error.message
					: m.mo_clinical_discharge_save_failed();
		} finally {
			isSaving = false;
		}
	}

	async function signSummary() {
		isSaving = true;
		message = '';
		try {
			fillForm(await request('POST', { action: 'sign', visitId }));
			isError = false;
			message = m.mo_clinical_discharge_signed();
		} catch (error) {
			isError = true;
			message =
				error instanceof Error
					? error.message
					: m.mo_clinical_discharge_sign_failed();
		} finally {
			isSaving = false;
		}
	}

	onMount(() => {
		void loadSummary();
	});
</script>

<svelte:head
	><title>{m.mo_clinical_discharge_title()}</title></svelte:head
>

<div class="flex max-w-5xl flex-col gap-4">
	<h1 class="text-xl font-semibold">
		{m.mo_clinical_discharge_title()}
	</h1>
	{#if !visitId}
		<WashAlert
			type={StatusColorEnum.INFO}
			message={m.mo_clinical_select_visit()}
		/>
	{:else}
		{#if message}
			<WashAlert
				type={isError
					? StatusColorEnum.ERROR
					: StatusColorEnum.SUCCESS}
				{message}
			/>
		{/if}
		{#if isLoading}
			<p class="text-sm opacity-70">{m.loading()}</p>
		{:else}
			<fieldset
				class="grid gap-4 md:grid-cols-2"
				disabled={!!summary?.signedAt}
			>
				<label class="flex flex-col gap-1 text-sm">
					<span>{m.mo_clinical_hospital_course()}</span>
					<WashTextarea
						className="min-h-36"
						bind:value={hospitalCourse}
					/>
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span>{m.mo_clinical_discharge_medications()}</span>
					<WashTextarea
						className="min-h-36"
						bind:value={dischargeMedications}
					/>
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span>{m.mo_clinical_follow_up()}</span>
					<WashTextarea className="min-h-28" bind:value={followUp} />
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span>{m.mo_clinical_red_flags()}</span>
					<WashTextarea className="min-h-28" bind:value={redFlags} />
				</label>
			</fieldset>
			<div class="flex justify-end gap-2">
				<WashButton
					className="btn-outline"
					onClick={saveSummary}
					disabled={isSaving || !!summary?.signedAt}
				>
					{m.mo_clinical_save()}
				</WashButton>
				<WashButton
					className="btn-primary"
					onClick={signSummary}
					disabled={isSaving || !summary || !!summary.signedAt}
				>
					{summary?.signedAt
						? m.mo_clinical_signed()
						: m.mo_clinical_sign()}
				</WashButton>
			</div>
		{/if}
	{/if}
</div>
