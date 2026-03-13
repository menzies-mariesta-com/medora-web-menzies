<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { PatientAllergyDialogState } from '$lib/state/patient-allergy-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import {
		getAllergies,
		getAllergyById,
		getAllergyPaginated,
		createAllergy
	} from '$lib/remote/table/information-table/allergy.remote';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { getSeverities } from '$lib/remote/table/master-table/severity.remote';
	import {
		createPatientAllergies,
		getPatientAllergiesById,
		updatePatientAllergies,
		getActivePatientAllergiesByPatientId,
		inactivateAllPatientAllergiesForPatient,
		inactivateOtherPatientAllergiesForPatient,
		inactivatePatientAllergiesByAllergyIdForPatient
	} from '$lib/remote/table/information-table/patient-allergies.remote';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DeactivationRemarkDialogState } from '$lib/state/deactivation-remark-dialog.state.svelte';
	import { AllergyEnum, StatusEnum } from '$lib/model/enum/db-link';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiSearchSelect from '$lib/component/library/daisyui/search-select/DaisyUISearchSelect.svelte';
	import LDeactivationRemarkDialogContent from './LDeactivationRemarkDialogContent.svelte';

	const toastService = new ToastService();

	type DeactivationRemarkResult = { deactivationRemark: string };

	let { confirm, cancel }: DialogSlotProps = $props();

	const patientId = $derived(PatientAllergyDialogState.patientId);
	const visitId = $derived(PatientAllergyDialogState.visitId);
	const patientAllergyId = $derived(
		PatientAllergyDialogState.patientAllergyId
	);
	const isEditMode = $derived(!!patientAllergyId);

	let allergies = $state<Awaited<ReturnType<typeof getAllergies>>>(
		[]
	);
	let severities = $state<Awaited<ReturnType<typeof getSeverities>>>(
		[]
	);
	let isSubmitting = $state(false);
	/** 'existing' = pick from master, 'new' = add to master then link */
	let allergyMode = $state<'existing' | 'new'>('existing');
	let selectedAllergyId = $state('');
	let newAllergyName = $state('');
	let severityId = $state('');
	let statusIdStr = $state(String(StatusEnum.ACTIVE));
	let reaction = $state('');
	let remark = $state('');
	let deactivationRemark = $state('');

	// Paginated server-side allergy search for the searchable select.
	async function searchAllergies(
		query: string
	): Promise<{ label: string; value: string }[]> {
		const res = await getAllergyPaginated({
			search: query.trim() || undefined,
			page: 1,
			pageSize: AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT
		});
		// Keep a small local cache for label lookups in this dialog session
		allergies = res.data;
		return res.data.map((a) => ({
			value: String(a.id),
			label: a.name ?? '–'
		}));
	}

	async function getAllergyLabelForValue(
		value: string
	): Promise<string> {
		const id = Number(value);
		if (!id) return '';
		const local = allergies.find((a) => a.id === id);
		if (local) return local.name ?? '–';
		const row = await getAllergyById({ id });
		return row?.name ?? '–';
	}

	$effect(() => {
		getAllergies().then((data) => {
			allergies = data;
		});
		getSeverities().then((data) => {
			severities = data;
		});
	});

	const allergyNameForEdit = $derived(
		isEditMode && selectedAllergyId
			? (allergies.find((a) => String(a.id) === selectedAllergyId)
					?.name ?? '–')
			: '–'
	);

	$effect(() => {
		const id = patientAllergyId;
		if (id) {
			getPatientAllergiesById({ id }).then((row) => {
				if (row) {
					selectedAllergyId = String(row.allergyId);
					allergyMode = 'existing';
					severityId = String(row.severityId);
					statusIdStr = String(row.statusId);
					reaction = row.reaction ?? '';
					remark = row.remark ?? '';
					deactivationRemark = row.deactivationRemark ?? '';
				}
			});
		} else {
			selectedAllergyId = '';
			newAllergyName = '';
			severityId = '';
			statusIdStr = String(StatusEnum.ACTIVE);
			reaction = '';
			remark = '';
			deactivationRemark = '';
			allergyMode = 'existing';
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!patientId || !visitId) {
			toastService.addToast(
				'No visit selected.',
				StatusColorEnum.ERROR
			);
			return;
		}

		const severityIdNum = severityId ? Number(severityId) : 0;
		if (!severityIdNum) {
			toastService.addToast(
				'Select a severity.',
				StatusColorEnum.ERROR
			);
			return;
		}

		let allergyId: number;

		if (isEditMode && patientAllergyId) {
			const newStatusId = statusIdStr
				? Number(statusIdStr)
				: StatusEnum.ACTIVE;
			const currentAllergyId = selectedAllergyId
				? Number(selectedAllergyId)
				: 0;

			if (newStatusId === StatusEnum.INACTIVE) {
				if (!deactivationRemark.trim()) {
					toastService.addToast(
						'Deactivation remark is required when inactivating an allergy.',
						StatusColorEnum.ERROR
					);
					return;
				}
			}

			// When changing status to Active, apply No Known Allergy rules
			if (newStatusId === StatusEnum.ACTIVE && patientId) {
				const activeList = await getActivePatientAllergiesByPatientId(
					{
						patientId
					}
				);
				const othersActive = activeList.filter(
					(r) => r.id !== patientAllergyId
				);

				if (currentAllergyId === AllergyEnum.NO_KNOWN_ALLERGY) {
					// Activating "No Known Allergy" → inactivate all other active allergies
					if (othersActive.length > 0) {
						DeactivationRemarkDialogState.message = `This patient has ${othersActive.length} other active allergy record(s). Activating "No Known Allergy" will mark them as inactive. Enter deactivation remark below to continue.`;
						const result =
							await dialogService.open<DeactivationRemarkResult>({
								title: 'Inactivate other allergies',
								component: LDeactivationRemarkDialogContent
							});
						if (!result.confirmed || !result.data?.deactivationRemark)
							return;
						await inactivateOtherPatientAllergiesForPatient({
							patientId,
							excludeId: patientAllergyId,
							deactivationRemark: result.data.deactivationRemark
						});
					}
				} else {
					// Activating another allergy → inactivate active "No Known Allergy" record(s)
					const noKnownActive = othersActive.filter(
						(r) => r.allergyId === AllergyEnum.NO_KNOWN_ALLERGY
					);
					if (noKnownActive.length > 0) {
						DeactivationRemarkDialogState.message = `This patient has "No Known Allergy" recorded as active. Activating this allergy will mark it as inactive. Enter deactivation remark below to continue.`;
						const result =
							await dialogService.open<DeactivationRemarkResult>({
								title: 'Inactivate No Known Allergy',
								component: LDeactivationRemarkDialogContent
							});
						if (!result.confirmed || !result.data?.deactivationRemark)
							return;
						await inactivatePatientAllergiesByAllergyIdForPatient({
							patientId,
							allergyId: AllergyEnum.NO_KNOWN_ALLERGY,
							deactivationRemark: result.data.deactivationRemark
						});
					}
				}
			}

			await updatePatientAllergies({
				id: patientAllergyId,
				severityId: severityIdNum,
				statusId: newStatusId,
				reaction: reaction.trim() || null,
				remark: remark.trim() || null,
				deactivationRemark:
					newStatusId === StatusEnum.INACTIVE
						? deactivationRemark.trim() || null
						: null
			});
			toastService.addToast(
				'Allergy record updated.',
				StatusColorEnum.SUCCESS
			);
			PatientAllergyDialogState.onSaved?.();
			confirm({ saved: true });
			return;
		}

		if (allergyMode === 'new') {
			const name = newAllergyName.trim();
			if (!name) {
				toastService.addToast(
					'Enter allergy name when adding new.',
					StatusColorEnum.ERROR
				);
				return;
			}

			try {
				const created = await createAllergy({ name });
				allergyId = created.id;
			} catch (error: unknown) {
				let message: string | null = null;

				if (error && typeof error === 'object') {
					const err = error as {
						message?: string;
						body?: { message?: string };
					};

					// SvelteKit remote command wraps server errors in HttpError;
					// original message is usually at error.body.message.
					if (err.body && typeof err.body.message === 'string') {
						message = err.body.message;
					} else if (typeof err.message === 'string') {
						message = err.message;
					}
				}

				if (!message) {
					message = 'Failed to create allergy. Please try again.';
				}

				toastService.addToast(message, StatusColorEnum.ERROR);
				return;
			}
		} else {
			const idNum = selectedAllergyId ? Number(selectedAllergyId) : 0;
			if (!idNum) {
				toastService.addToast(
					'Select an allergy or add a new one.',
					StatusColorEnum.ERROR
				);
				return;
			}
			allergyId = idNum;
		}

		// When adding "No Known Allergy" (id 1), check existing active allergies and show combined confirm + deactivation remark before inactivating them
		if (allergyId === AllergyEnum.NO_KNOWN_ALLERGY && patientId) {
			const existing = await getActivePatientAllergiesByPatientId({
				patientId
			});
			if (existing.length > 0) {
				DeactivationRemarkDialogState.message = `This patient has ${existing.length} existing allergy record(s). Adding "No Known Allergy" will mark them as inactive. Enter deactivation remark below to continue.`;
				const result =
					await dialogService.open<DeactivationRemarkResult>({
						title: 'Inactivate other allergies',
						component: LDeactivationRemarkDialogContent
					});
				if (!result.confirmed || !result.data?.deactivationRemark)
					return;
				await inactivateAllPatientAllergiesForPatient({
					patientId,
					deactivationRemark: result.data.deactivationRemark
				});
			}
		}

		// When adding any other allergy, if patient has active "No Known Allergy", show combined confirm + deactivation remark and inactivate it
		if (allergyId !== AllergyEnum.NO_KNOWN_ALLERGY && patientId) {
			const activeList = await getActivePatientAllergiesByPatientId({
				patientId
			});
			const noKnownActive = activeList.filter(
				(r) => r.allergyId === AllergyEnum.NO_KNOWN_ALLERGY
			);
			if (noKnownActive.length > 0) {
				DeactivationRemarkDialogState.message = `This patient has "No Known Allergy" recorded as active. Adding this allergy will mark it as inactive. Enter deactivation remark below to continue.`;
				const result =
					await dialogService.open<DeactivationRemarkResult>({
						title: 'Inactivate No Known Allergy',
						component: LDeactivationRemarkDialogContent
					});
				if (!result.confirmed || !result.data?.deactivationRemark)
					return;
				await inactivatePatientAllergiesByAllergyIdForPatient({
					patientId,
					allergyId: AllergyEnum.NO_KNOWN_ALLERGY,
					deactivationRemark: result.data.deactivationRemark
				});
			}
		}

		isSubmitting = true;
		try {
			await createPatientAllergies({
				visitId,
				patientId,
				allergyId,
				severityId: severityIdNum,
				reaction: reaction.trim() || null,
				remark: remark.trim() || null
			});
			toastService.addToast(
				'Allergy added to patient.',
				StatusColorEnum.SUCCESS
			);
			PatientAllergyDialogState.onSaved?.();
			confirm({ saved: true });
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: 'Failed to add allergy.') as string,
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	<div class="flex flex-col gap-4">
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel
				forText="allergy-source"
				className="shrink-0 sm:w-36"
			>
				Allergy
			</DaisyUiLabel>
			<div class="flex flex-1 flex-col gap-3">
				{#if isEditMode}
					<p class="text-base-content/80">
						{allergyNameForEdit ?? '–'}
					</p>
				{:else}
					<div class="flex flex-wrap gap-4">
						<label class="d-label cursor-pointer gap-2">
							<input
								type="radio"
								name="allergy-mode"
								class="d-radio d-radio-sm"
								checked={allergyMode === 'existing'}
								onchange={() => (allergyMode = 'existing')}
							/>
							<span>Select from list</span>
						</label>
						<label class="d-label cursor-pointer gap-2">
							<input
								type="radio"
								name="allergy-mode"
								class="d-radio d-radio-sm"
								checked={allergyMode === 'new'}
								onchange={() => (allergyMode = 'new')}
							/>
							<span>Add new to master</span>
						</label>
					</div>
					<div class="flex max-w-80">
						{#if allergyMode === 'existing'}
							<DaisyUiSearchSelect
								bind:value={selectedAllergyId}
								placeholder="Select allergy"
								className="w-full"
								searchFn={searchAllergies}
								getLabelForValue={getAllergyLabelForValue}
								minSearchLength={0}
							/>
						{:else}
							<DaisyUiInputField
								id="allergy-name"
								bind:value={newAllergyName}
								inputType="text"
								inputPlaceholderText="e.g. Penicillin"
							/>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="severity" className="shrink-0 sm:w-36">
				Severity <span class="text-error">*</span>
			</DaisyUiLabel>
			<div class="max-w-80 flex-1">
				<DaisyUiSelect
					id="severity"
					bind:value={severityId}
					optionHeader="Select severity ..."
				>
					{#each severities as s (s.id)}
						<option value={String(s.id)}>{s.name ?? '–'}</option>
					{/each}
				</DaisyUiSelect>
			</div>
		</div>

		{#if isEditMode}
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel forText="status" className="shrink-0 sm:w-36">
					Status
				</DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<DaisyUiSelect
						id="status"
						bind:value={statusIdStr}
						optionHeader="Select status ..."
					>
						<option value={String(StatusEnum.ACTIVE)}>Active</option>
						<option value={String(StatusEnum.INACTIVE)}
							>Inactive</option
						>
					</DaisyUiSelect>
				</div>
			</div>
			{#if statusIdStr === String(StatusEnum.INACTIVE)}
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
				>
					<DaisyUiLabel
						forText="deactivation-remark"
						className="shrink-0 sm:w-36"
					>
						Deactivation remark <span class="text-error">*</span>
					</DaisyUiLabel>
					<div class="min-w-0 flex-1">
						<DaisyUiTextarea
							id="deactivation-remark"
							bind:value={deactivationRemark}
							placeholder="Reason for deactivating this allergy"
							className="w-full"
						/>
					</div>
				</div>
			{/if}
		{/if}

		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
		>
			<DaisyUiLabel forText="reaction" className="shrink-0 sm:w-36">
				Reaction
			</DaisyUiLabel>
			<div class="min-w-0 flex-1">
				<DaisyUiTextarea
					id="reaction"
					bind:value={reaction}
					placeholder="e.g. Rash, swelling"
					className="w-full"
				/>
			</div>
		</div>

		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
		>
			<DaisyUiLabel forText="remark" className="shrink-0 sm:w-36">
				Remark
			</DaisyUiLabel>
			<div class="min-w-0 flex-1">
				<DaisyUiTextarea
					id="remark"
					bind:value={remark}
					placeholder="Optional notes"
					className="w-full"
				/>
			</div>
		</div>
	</div>

	<div class="flex flex-wrap justify-end gap-2">
		<DaisyUiButton
			type="button"
			className="d-btn-ghost"
			onClick={() => cancel()}
		>
			Cancel
		</DaisyUiButton>
		<DaisyUiButton
			type="submit"
			className="d-btn-primary"
			disabled={isSubmitting}
		>
			{isSubmitting
				? 'Saving…'
				: isEditMode
					? 'Update'
					: 'Add allergy'}
		</DaisyUiButton>
	</div>
</form>
