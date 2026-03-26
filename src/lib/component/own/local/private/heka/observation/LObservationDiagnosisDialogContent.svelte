<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationDiagnosisDialogState } from '$lib/state/observation-diagnosis-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import {
		createDiagnosis,
		getDiagnosisById,
		getDiagnosisTypes,
		updateDiagnosis
	} from '$lib/remote/table/information-table/diagnosis.remote';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const visitId = $derived(ObservationDiagnosisDialogState.visitId);
	const branchId = $derived(ObservationDiagnosisDialogState.branchId);
	const patientId = $derived(
		ObservationDiagnosisDialogState.patientId
	);
	const diagnosisId = $derived(
		ObservationDiagnosisDialogState.diagnosisId
	);
	const isEdit = $derived(diagnosisId != null);

	let types = $state<Awaited<ReturnType<typeof getDiagnosisTypes>>>(
		[]
	);
	let selectedDiagnosisTypeIds = $state<number[]>([]);
	let description = $state('');
	let statusIdStr = $state(String(StatusEnum.ACTIVE));
	let isSubmitting = $state(false);
	let loadSeq = 0;

	const allDiagnosisTypesSelected = $derived(
		types.length > 0 && selectedDiagnosisTypeIds.length === types.length
	);

	function resetDiagnosisForm() {
		selectedDiagnosisTypeIds = [];
		description = '';
		statusIdStr = String(StatusEnum.ACTIVE);
	}

	async function loadDiagnosisTypes() {
		const rows = await getDiagnosisTypes();
		types = rows;
	}

	async function loadDiagnosisByIdForEdit(did: number, seq: number) {
		const row = await getDiagnosisById({ id: did });
		if (seq !== loadSeq) return;
		if (!row) {
			toastService.addToast(
				m.observation_emr_diagnosis_not_found(),
				StatusColorEnum.ERROR
			);
			cancel();
			return;
		}

		selectedDiagnosisTypeIds = [Number(row.diagnosisTypeId)];
		description = row.description ?? '';
		statusIdStr = String(row.statusId ?? StatusEnum.ACTIVE);
	}

	$effect(() => {
		void loadDiagnosisTypes();
	});

	$effect(() => {
		const vid = visitId;
		const bid = branchId;
		const pid = patientId;
		const did = diagnosisId;
		if (!vid || !bid || !pid) return;
		const seq = ++loadSeq;
		if (did == null) {
			resetDiagnosisForm();
			return;
		}
		void loadDiagnosisByIdForEdit(did, seq);
	});

	async function handleSubmit() {
		const vid = visitId;
		const bid = branchId;
		const pid = patientId;
		if (!vid || !bid || !pid) {
			toastService.addToast(
				m.observation_emr_visit_missing(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const statusId = Number(statusIdStr) || StatusEnum.ACTIVE;
		const normalizedDescription = description.trim();

		const selectedTypeIds = selectedDiagnosisTypeIds.filter(
			(id): id is number => Number.isFinite(id) && id > 0
		);
		if (isEdit) {
			// In edit mode, backend expects exactly one `diagnosisTypeId`.
			if (selectedTypeIds.length !== 1) {
				toastService.addToast(
					m.observation_emr_diagnosis_type_required(),
					StatusColorEnum.ERROR
				);
				return;
			}
		} else if (selectedTypeIds.length === 0) {
			// In add mode, backend requires at least one selected type.
			toastService.addToast(
				m.observation_emr_diagnosis_type_required(),
				StatusColorEnum.ERROR
			);
			return;
		}

		const typeId = selectedTypeIds[0];
		isSubmitting = true;
		try {
			if (isEdit && diagnosisId != null) {
				await updateDiagnosis({
					id: diagnosisId,
					diagnosisTypeId: typeId,
					description:
						normalizedDescription.length > 0
							? normalizedDescription
							: null,
					statusId
				});
			} else {
				// Backend requires a single `diagnosisTypeId` per diagnosis record.
				// In add mode, create one record per selected type.
				for (const diagnosisTypeId of selectedTypeIds) {
					await createDiagnosis({
						branchId: bid,
						patientId: pid,
						visitId: vid,
						diagnosisTypeId,
						description:
							normalizedDescription.length > 0
								? normalizedDescription
								: null,
						statusId
					});
				}
			}
			toastService.addToast(
				m.observation_emr_saved(),
				StatusColorEnum.SUCCESS
			);
			ObservationDiagnosisDialogState.onSaved?.();
			await confirm({ saved: true });
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: m.observation_emr_save_failed()) as string,
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<fieldset class="flex flex-col gap-2 border-0 p-0">
		<legend class="mb-1 text-sm font-medium">
			{m.observation_emr_diagnosis_type_label()}
		</legend>
		<div class="flex flex-wrap gap-4">
			<label class="d-label cursor-pointer justify-start gap-3">
				<input
					type="checkbox"
					name="diagnosis-type-id-all"
					class="d-checkbox shrink-0 d-checkbox-sm d-checkbox-primary"
					checked={allDiagnosisTypesSelected}
					disabled={isSubmitting || isEdit}
					onchange={() => {
						if (isEdit) return;
						if (allDiagnosisTypesSelected) {
							selectedDiagnosisTypeIds = [];
							return;
						}
						selectedDiagnosisTypeIds = types.map((t) => Number(t.id));
					}}
				/>
				<span class="text-sm">All</span>
			</label>

			{#each types as t (t.id)}
				<label class="d-label cursor-pointer justify-start gap-3">
					<input
						type="checkbox"
						name="diagnosis-type-id"
						class="d-checkbox shrink-0 d-checkbox-sm d-checkbox-primary"
						value={String(t.id)}
						checked={selectedDiagnosisTypeIds.includes(Number(t.id))}
						disabled={isSubmitting}
						onchange={(event) => {
							const checked = (event.currentTarget as HTMLInputElement).checked;
							const typeId = Number(t.id);

							if (isEdit) {
								// In edit mode, selection must effectively be single.
								// Keep exactly one selected even if the user tries to uncheck.
								selectedDiagnosisTypeIds = [typeId];
								return;
							}

							if (checked) {
								if (!selectedDiagnosisTypeIds.includes(typeId)) {
									selectedDiagnosisTypeIds = [
										...selectedDiagnosisTypeIds,
										typeId
									];
								}
							} else {
								selectedDiagnosisTypeIds = selectedDiagnosisTypeIds.filter(
									(id) => id !== typeId
								);
							}
						}}
					/>
					<span class="text-sm">{t.name ?? '–'}</span>
				</label>
			{/each}
		</div>
	</fieldset>

	<div class="flex flex-col gap-1">
		<DaisyUiLabel forText="diagnosis-description">
			{m.observation_emr_instruction()}
		</DaisyUiLabel>
		<DaisyUiTextarea
			id="diagnosis-description"
			className="d-textarea-bordered min-h-24 w-full"
			placeholder={m.observation_emr_note_placeholder()}
			bind:value={description}
		/>
	</div>

	{#if isEdit}
		<div class="flex flex-col gap-1">
			<DaisyUiLabel forText="diagnosis-status">
				{m.observation_emr_status()}
			</DaisyUiLabel>
			<DaisyUiSelect
				name="diagnosis-status"
				className="d-select-bordered w-full"
				bind:value={statusIdStr}
				disabled={isSubmitting}
			>
				<option value={String(StatusEnum.ACTIVE)}>Active</option>
				<option value={String(StatusEnum.INACTIVE)}>Inactive</option>
			</DaisyUiSelect>
		</div>
	{/if}

	<div class="flex flex-wrap justify-end gap-2 pt-2">
		<DaisyUiButton
			type="button"
			className="d-btn d-btn-ghost"
			disabled={isSubmitting}
			onClick={() => dialogService.cancel()}
		>
			{m.observation_emr_cancel()}
		</DaisyUiButton>
		<DaisyUiButton
			type="button"
			className="d-btn d-btn-primary"
			disabled={isSubmitting}
			loading={isSubmitting}
			onClick={() => void handleSubmit()}
		>
			{m.observation_emr_save()}
		</DaisyUiButton>
	</div>
</div>
