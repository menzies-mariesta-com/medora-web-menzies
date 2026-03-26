<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationVisitTextDialogState } from '$lib/state/observation-visit-text-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import {
		getPatientVisitById,
		updatePatientVisit
	} from '$lib/remote/table/information-table/patient-visit.remote';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const visitId = $derived(ObservationVisitTextDialogState.visitId);
	const field = $derived(ObservationVisitTextDialogState.field);

	let text = $state('');
	let isSubmitting = $state(false);
	let loadSeq = $state(0);

	const dialogTitle = $derived(
		field === 'chiefComplaint'
			? m.observation_emr_chief_complaint()
			: field === 'patientCondition'
				? m.observation_emr_patient_condition()
				: field === 'diagnosisNotes'
					? m.observation_emr_diagnosis()
					: m.observation_emr_clinical_note()
	);

	$effect(() => {
		const vid = visitId;
		const f = field;
		if (vid == null || f == null) return;
		const seq = ++loadSeq;
		(async () => {
			const v = await getPatientVisitById({ id: vid });
			if (seq !== loadSeq) return;
			if (f === 'chiefComplaint') {
				text = v?.chiefComplaint ?? '';
			} else if (f === 'patientCondition') {
				text = v?.patientCondition ?? '';
			} else {
				text = v?.diagnosisNotes ?? '';
			}
		})();
	});

	async function handleSave() {
		if (visitId == null || field == null) return;
		isSubmitting = true;
		try {
			const trimmed = text.trim();
			const empty = trimmed === '' ? null : trimmed;
			if (field === 'chiefComplaint') {
				await updatePatientVisit({
					id: visitId,
					chiefComplaint: empty
				});
			} else if (field === 'patientCondition') {
				await updatePatientVisit({
					id: visitId,
					patientCondition: empty
				});
			} else {
				await updatePatientVisit({
					id: visitId,
					diagnosisNotes: empty
				});
			}
			toastService.addToast(
				m.observation_emr_saved(),
				StatusColorEnum.SUCCESS
			);
			ObservationVisitTextDialogState.onSaved?.();
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
	<p class="text-sm font-medium">{dialogTitle}</p>
	<div class="flex flex-col gap-1">
		<DaisyUiLabel forText="obs-visit-text" className="text-sm">
			{m.observation_emr_note_label()}
		</DaisyUiLabel>
		<DaisyUiTextarea
			id="obs-visit-text"
			bind:value={text}
			className="textarea-bordered min-h-40 w-full"
			placeholder={m.observation_emr_note_placeholder()}
		/>
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		<DaisyUiButton className="d-btn-ghost" onClick={() => cancel()}>
			{m.observation_emr_cancel()}
		</DaisyUiButton>
		<DaisyUiButton
			className="d-btn-primary"
			disabled={isSubmitting}
			onClick={handleSave}
		>
			{m.observation_emr_save()}
		</DaisyUiButton>
	</div>
</div>
