<script lang="ts">
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type {
		ImagingResultRow,
		LabResultRow
	} from '$lib/model/type/medora/clinical.type';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { m } from '$lib/paraglide/messages';

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(
		Number(
			page.url.searchParams.get('visitId') ?? VisitState.visitId ?? 0
		)
	);
	const apiBase = $derived(
		`/api/medora/hospital/${hospitalId}/home/consultation/results`
	);
	let labs = $state<LabResultRow[]>([]);
	let imaging = $state<ImagingResultRow[]>([]);
	let labText = $state('');
	let labCritical = $state(false);
	let imagingFindings = $state('');
	let attachmentUrl = $state('');
	let isBusy = $state(false);
	let errorMessage = $state('');

	async function apiPost(body: Record<string, unknown>) {
		const response = await fetch(apiBase, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!response.ok) throw new Error(await response.text());
	}

	async function loadResults() {
		if (!hospitalId || !visitId) return;
		isBusy = true;
		errorMessage = '';
		try {
			const response = await fetch(`${apiBase}?visitId=${visitId}`);
			if (!response.ok) throw new Error(await response.text());
			const result = (await response.json()) as {
				labs: LabResultRow[];
				imaging: ImagingResultRow[];
			};
			labs = result.labs;
			imaging = result.imaging;
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: m.mo_clinical_results_load_failed();
		} finally {
			isBusy = false;
		}
	}

	async function saveLab() {
		if (!labText.trim()) return;
		isBusy = true;
		try {
			await apiPost({
				action: 'saveLab',
				visitId,
				resultText: labText,
				isCritical: labCritical
			});
			labText = '';
			labCritical = false;
			await loadResults();
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: m.mo_clinical_lab_save_failed();
		} finally {
			isBusy = false;
		}
	}

	async function saveImaging() {
		if (!imagingFindings.trim()) return;
		isBusy = true;
		try {
			await apiPost({
				action: 'saveImaging',
				visitId,
				findings: imagingFindings,
				attachmentUrl: attachmentUrl.trim() || null
			});
			imagingFindings = '';
			attachmentUrl = '';
			await loadResults();
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: m.mo_clinical_imaging_save_failed();
		} finally {
			isBusy = false;
		}
	}

	async function endorse(kind: 'lab' | 'imaging', id: number) {
		isBusy = true;
		try {
			await apiPost({ action: 'endorse', kind, id });
			await loadResults();
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: m.mo_clinical_endorse_failed();
		} finally {
			isBusy = false;
		}
	}

	$effect(() => {
		void visitId;
		void loadResults();
	});
</script>

<svelte:head
	><title>{m.mo_clinical_results_title()}</title></svelte:head
>

<div class="flex flex-col gap-4">
	<h1 class="text-xl font-semibold">
		{m.mo_clinical_results_title()}
	</h1>
	{#if !visitId}
		<WashAlert
			type={StatusColorEnum.INFO}
			message={m.mo_clinical_select_visit()}
		/>
	{:else}
		{#if errorMessage}
			<WashAlert
				type={StatusColorEnum.ERROR}
				message={errorMessage}
			/>
		{/if}
		<div class="grid gap-4 xl:grid-cols-2">
			<section class="card border border-base-300">
				<div class="card-body gap-3 p-4">
					<h2 class="card-title text-base">
						{m.mo_clinical_laboratory()}
					</h2>
					<WashTextarea
						bind:value={labText}
						placeholder={m.mo_clinical_result()}
						className="min-h-24"
					/>
					<label class="flex items-center gap-2 text-sm">
						<input
							class="checkbox checkbox-sm"
							type="checkbox"
							bind:checked={labCritical}
						/>
						{m.mo_clinical_critical_result()}
					</label>
					<WashButton
						className="btn-primary btn-sm self-end"
						onClick={saveLab}
						disabled={isBusy || !labText.trim()}
					>
						{m.mo_clinical_save_lab()}
					</WashButton>
					<ul class="flex flex-col gap-2">
						{#each labs as row (row.id)}
							<li class="rounded-box bg-base-200 p-3 text-sm">
								<div class="flex justify-between gap-2">
									<p class="whitespace-pre-wrap">{row.resultText}</p>
									{#if !row.endorsedAt}
										<WashButton
											className="btn-ghost btn-xs"
											onClick={() => endorse('lab', row.id)}
											>{m.mo_clinical_endorse()}</WashButton
										>
									{:else}
										<span class="badge badge-success badge-sm"
											>{m.mo_clinical_endorsed()}</span
										>
									{/if}
								</div>
								{#if row.isCritical}<span
										class="badge badge-error badge-sm mt-2"
										>{m.mo_clinical_critical()}</span
									>{/if}
							</li>
						{/each}
					</ul>
				</div>
			</section>

			<section class="card border border-base-300">
				<div class="card-body gap-3 p-4">
					<h2 class="card-title text-base">
						{m.mo_clinical_imaging()}
					</h2>
					<WashTextarea
						bind:value={imagingFindings}
						placeholder={m.mo_clinical_findings()}
						className="min-h-24"
					/>
					<WashInputField
						bind:value={attachmentUrl}
						inputType="url"
						inputPlaceholderText={m.mo_clinical_attachment_url()}
					/>
					<WashButton
						className="btn-primary btn-sm self-end"
						onClick={saveImaging}
						disabled={isBusy || !imagingFindings.trim()}
					>
						{m.mo_clinical_save_imaging()}
					</WashButton>
					<ul class="flex flex-col gap-2">
						{#each imaging as row (row.id)}
							<li class="rounded-box bg-base-200 p-3 text-sm">
								<div class="flex justify-between gap-2">
									<p class="whitespace-pre-wrap">{row.findings}</p>
									{#if !row.endorsedAt}
										<WashButton
											className="btn-ghost btn-xs"
											onClick={() => endorse('imaging', row.id)}
											>{m.mo_clinical_endorse()}</WashButton
										>
									{:else}
										<span class="badge badge-success badge-sm"
											>{m.mo_clinical_endorsed()}</span
										>
									{/if}
								</div>
								{#if row.attachmentUrl}
									<button
										type="button"
										class="link text-left text-xs"
										onclick={() =>
											window.open(
												row.attachmentUrl ?? '',
												'_blank',
												'noopener'
											)}
									>
										{m.mo_clinical_attachment()}
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			</section>
		</div>
	{/if}
</div>
