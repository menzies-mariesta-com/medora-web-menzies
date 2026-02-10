<script lang="ts">
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/library/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';

	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	import { getPatient } from '$lib/remote/table/information-table/patient.remote';
	import { createPatientAttachment } from '$lib/remote/table/information-table/patient-attachment.remote';

	import type {
		PatientSchema,
	} from '$lib/server/db/schema-type';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

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
		fetchPatients();
	});

	function formatPatientLabel(p: PatientSchema): string {
		const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
		const code = p.code ? ` (${p.code})` : '';
		return name || p.id + code;
	}

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
				filePath: data.url,
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
		<form onsubmit={handleOnSubmit} class="space-y-6 max-w-2xl">
			<DaisyUiCardBodyTitle className="mb-2">
				Patient Attachment
			</DaisyUiCardBodyTitle>

			<div class="space-y-4">
				<label class="form-control w-full">
					<span class="label-text mb-1 text-sm opacity-80">
						Patient
					</span>
					<DaisyUiSelect
						className="w-full"
						bind:value={selectedPatientId}
						disabled={isLoadingPatients}
						optionHeader={isLoadingPatients ? 'Loading patients…' : 'Select patient'}
					>
						{#each patients as p (p.id)}
							<option value={p.id}>{formatPatientLabel(p)}</option>
						{/each}
					</DaisyUiSelect>
				</label>

				<label class="form-control w-full">
					<span class="label-text mb-1 text-sm opacity-80">
						File attachment
					</span>
					<input
						type="file"
						class="file-input file-input-bordered w-full max-w-xs"
						bind:this={attachmentInputEl}
						onchange={handleFileChange}
					/>
					{#if attachmentFile}
						<span class="mt-1 text-xs opacity-80">
							Selected: {attachmentFile.name}
						</span>
					{/if}
				</label>

				<label class="form-control w-full">
					<span class="label-text mb-1 text-sm opacity-80">
						Description
					</span>
					<textarea
						class="d-textarea h-24 w-full"
						placeholder="Optional description"
						bind:value={description}
					></textarea>
				</label>
			</div>

			<DaisyUiCardBodyAction className="mt-4">
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

