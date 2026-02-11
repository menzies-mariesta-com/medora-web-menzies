<script lang="ts">
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/library/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';

	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { page } from '$app/state';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	import { getPatient } from '$lib/remote/table/information-table/patient.remote';
	import { createPatientAttachment } from '$lib/remote/table/information-table/patient-attachment.remote';

	import type { PatientSchema } from '$lib/server/db/schema-type';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const embeddedPatientId = $derived(page.url.searchParams.get('patientId'));
	const isEmbeddedSinglePatient = $derived(!!embeddedPatientId);

	let patients: PatientSchema[] = $state([]);
	let isLoadingPatients = $state(false);
	let isSubmitting = $state(false);

	let selectedPatientId: string = $state('');
	let attachmentFile: File | null = $state(null);
	let attachmentInputEl: HTMLInputElement | undefined = $state();
	let description: string = $state('');

	async function fetchPatients() {
		isLoadingPatients = true;
		try {
			patients = await getPatient();
		} finally {
			isLoadingPatients = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchPatients().then(() => {
			if (embeddedPatientId) {
				selectedPatientId = embeddedPatientId;
			}
		});
	});

	function formatPatientLabel(p: PatientSchema): string {
		const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
		const code = p.code ? ` (${p.code})` : '';
		return name || p.id + code;
	}

	const optionHeaderPatient = $derived(
		isLoadingPatients ? 'Loading patients…' : 'Select a patient …'
	);

	function handleFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		attachmentFile = file;
	}

	async function handleOnSubmit(e: SubmitEvent) {
		e.preventDefault();

		if (!selectedPatientId) {
			toastService.addToast('Please select a patient.', StatusColorEnum.ERROR);
			return;
		}
		if (!attachmentFile) {
			toastService.addToast('Please choose a file to upload.', StatusColorEnum.ERROR);
			return;
		}

		isSubmitting = true;
		try {
			const fd = new FormData();
			fd.set('photo', attachmentFile);
			const res = await fetch('/api/upload/staff-photo', {
				method: 'POST',
				body: fd
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.url) {
				toastService.addToast(
					data.error ?? 'File upload failed.',
					StatusColorEnum.ERROR
				);
				isSubmitting = false;
				return;
			}

			await createPatientAttachment({
				patientId: selectedPatientId,
				fileUrl: data.url,
				description: description.trim() || undefined,
			});
			toastService.addToast(
				'Attachment saved successfully.',
				StatusColorEnum.SUCCESS,
			);
			attachmentFile = null;
			if (attachmentInputEl) attachmentInputEl.value = '';
			description = '';
		} catch (error: unknown) {
			let message: string | null = null;
			if (error && typeof error === 'object') {
				const err = error as { message?: string; body?: { message?: string } };
				if (err.body && typeof err.body.message === 'string') {
					message = err.body.message;
				} else if (typeof err.message === 'string') {
					message = err.message;
				}
			}
			if (!message) {
				message = 'Failed to save attachment. Please try again.';
			}
			toastService.addToast(message, StatusColorEnum.ERROR);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<form onsubmit={handleOnSubmit} class="max-w-2xl">
			<DaisyUiCardBodyTitle className="mb-5">
				Patient Attachment
			</DaisyUiCardBodyTitle>

			<div class="flex flex-col gap-4">
				{#if isEmbeddedSinglePatient}
					<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
						<DaisyUiLabel className="shrink-0 sm:w-36">Patient</DaisyUiLabel>
						<div class="max-w-80 flex-1">
							<p class="truncate text-sm font-medium">
								{#if patients.length > 0}
									{@const p = patients.find((p) => p.id === embeddedPatientId)}
									{p ? formatPatientLabel(p) : embeddedPatientId}
								{:else}
									Loading…
								{/if}
							</p>
						</div>
					</div>
				{:else}
					<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
						<DaisyUiLabel forText="patient" className="shrink-0 sm:w-36">Patient</DaisyUiLabel>
						<div class="max-w-80 flex-1">
							<DaisyUiSelect
								className="w-full"
								bind:value={selectedPatientId}
								disabled={isLoadingPatients}
								optionHeader={optionHeaderPatient}
							>
								{#each patients as p (p.id)}
									<option value={p.id}>{formatPatientLabel(p)}</option>
								{/each}
							</DaisyUiSelect>
						</div>
					</div>
				{/if}

				<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
					<DaisyUiLabel forText="attachment-file" className="shrink-0 sm:w-36">File attachment</DaisyUiLabel>
					<div class="max-w-80 flex-1">
						<input
							id="attachment-file"
							type="file"
							class="file-input file-input-bordered w-full max-w-xs"
							bind:this={attachmentInputEl}
							onchange={handleFileChange}
						/>
						{#if attachmentFile}
							<span class="mt-1 block text-xs opacity-80">
								Selected: {attachmentFile.name}
							</span>
						{/if}
					</div>
				</div>

				<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
					<DaisyUiLabel forText="attachment-description" className="shrink-0 sm:w-36 pt-1">Description</DaisyUiLabel>
					<div class="max-w-80 flex-1">
						<DaisyUiTextarea
							id="attachment-description"
							bind:value={description}
							placeholder="Optional description"
							className="w-full min-h-24 resize-y"
						/>
					</div>
				</div>
			</div>

			<DaisyUiCardBodyAction className="mt-6">
				<DaisyUiButton
					type="submit"
					className="d-btn-primary d-btn-wide"
					disabled={isSubmitting || isLoadingPatients}
				>
					{isSubmitting ? 'Saving...' : 'Save'}
				</DaisyUiButton>
			</DaisyUiCardBodyAction>
		</form>
	</DaisyUiCardBody>
</DaisyUiCard>

