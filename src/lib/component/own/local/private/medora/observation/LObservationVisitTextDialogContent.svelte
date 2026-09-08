<script lang="ts">
	import { page } from '$app/state';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationVisitTextDialogState } from '$lib/state/observation-visit-text-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const hospitalId = $derived(page.params.hospital_id ?? '');

	const visitId = $derived(ObservationVisitTextDialogState.visitId);
	const field = $derived(ObservationVisitTextDialogState.field);

	let text = $state('');
	let isSubmitting = $state(false);
	let loadSeq = $state(0);

	type VisitRow = {
		id: number;
		chiefComplaint: string | null;
		patientCondition: string | null;
		diagnosisNotes: string | null;
	};

	async function apiGet<T>(
		mode: string,
		params?: Record<string, string>
	) {
		const hid = hospitalId;
		if (!hid) throw new Error('Hospital is required');
		const url = new URL(
			`/api/medora/hospital/${hid}/home/consultation/emr`,
			location.origin
		);
		url.searchParams.set('mode', mode);
		if (params) {
			for (const [k, v] of Object.entries(params)) {
				url.searchParams.set(k, v);
			}
		}
		const res = await fetch(url.toString());
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	async function apiPost<T>(mode: string, payload: unknown) {
		const hid = hospitalId;
		if (!hid) throw new Error('Hospital is required');
		const res = await fetch(
			`/api/medora/hospital/${hid}/home/consultation/emr`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode,
					...(payload as Record<string, unknown>)
				})
			}
		);
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

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
			const v = await apiGet<VisitRow | null>('visit.get', {
				visitId: String(vid)
			});
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
				await apiPost('visit.updateText', {
					id: visitId,
					chiefComplaint: empty
				});
			} else if (field === 'patientCondition') {
				await apiPost('visit.updateText', {
					id: visitId,
					patientCondition: empty
				});
			} else {
				await apiPost('visit.updateText', {
					id: visitId,
					diagnosisNotes: empty
				});
			}
			toastSuccess(
				toastService,
				dialogTitle,
				m.toast_action_updated()
			);
			ObservationVisitTextDialogState.onSaved?.();
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
	<p class="text-sm font-medium">{dialogTitle}</p>
	<div class="flex flex-col gap-1">
		<label for="obs-visit-text" class="text-sm">
			{m.observation_emr_note_label()}
		</label>
		<WashTextarea
			id="obs-visit-text"
			bind:value={text}
			className="textarea-bordered min-h-40 w-full"
			placeholder={m.observation_emr_note_placeholder()}
		/>
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		<WashButton
			className="btn-ghost"
			onClick={() => {
				if (isSubmitting) return;
				cancel();
			}}
			disabled={isSubmitting}
		>
			{m.observation_emr_cancel()}
		</WashButton>
		<WashButton
			className="btn-primary"
			disabled={isSubmitting}
			loading={isSubmitting}
			onClick={handleSave}
		>
			{m.observation_emr_save()}
		</WashButton>
	</div>
</div>
