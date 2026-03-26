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
	let diagnosisTypeIdStr = $state('');
	let description = $state('');
	let statusIdStr = $state(String(StatusEnum.ACTIVE));
	let isSubmitting = $state(false);
	let loadSeq = 0;

	$effect(() => {
		void getDiagnosisTypes().then((rows) => {
			types = rows;
		});
	});

	$effect(() => {
		const vid = visitId;
		const bid = branchId;
		const pid = patientId;
		const did = diagnosisId;
		if (!vid || !bid || !pid) return;
		const seq = ++loadSeq;
		if (!did) {
			diagnosisTypeIdStr = '';
			description = '';
			statusIdStr = String(StatusEnum.ACTIVE);
			return;
		}
		void getDiagnosisById({ id: did }).then((row) => {
			if (seq !== loadSeq) return;
			if (!row) {
				toastService.addToast(
					m.observation_emr_diagnosis_not_found(),
					StatusColorEnum.ERROR
				);
				cancel();
				return;
			}
			diagnosisTypeIdStr = String(row.diagnosisTypeId);
			description = row.description ?? '';
			statusIdStr = String(row.statusId ?? StatusEnum.ACTIVE);
		});
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
		const typeId = Number(diagnosisTypeIdStr);
		if (!typeId) {
			toastService.addToast(
				m.observation_emr_diagnosis_type_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const statusId = Number(statusIdStr) || StatusEnum.ACTIVE;
		const normalizedDescription = description.trim();
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
				await createDiagnosis({
					branchId: bid,
					patientId: pid,
					visitId: vid,
					diagnosisTypeId: typeId,
					description:
						normalizedDescription.length > 0
							? normalizedDescription
							: null,
					statusId: StatusEnum.ACTIVE
				});
			}
			toastService.addToast(
				m.observation_emr_saved(),
				StatusColorEnum.SUCCESS
			);
			ObservationDiagnosisDialogState.onSaved?.();
			confirm({ saved: true });
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
			{#each types as t (t.id)}
				<label class="d-label cursor-pointer justify-start gap-3">
					<input
						type="radio"
						name="diagnosis-type-id"
						class="d-radio shrink-0 d-radio-sm d-radio-primary"
						value={String(t.id)}
						checked={diagnosisTypeIdStr === String(t.id)}
						disabled={isSubmitting}
						onchange={() => {
							diagnosisTypeIdStr = String(t.id);
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
			onClick={() => void handleSubmit()}
		>
			{m.observation_emr_save()}
		</DaisyUiButton>
	</div>
</div>
