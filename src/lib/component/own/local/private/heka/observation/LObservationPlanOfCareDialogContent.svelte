<script lang="ts">
	import { page } from '$app/state';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationPlanOfCareDialogState } from '$lib/state/observation-plan-of-care-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const hospitalId = $derived(
		ObservationPlanOfCareDialogState.hospitalId ??
			page.params.hospital_id ??
			''
	);
	const visitId = $derived(ObservationPlanOfCareDialogState.visitId);
	const patientId = $derived(ObservationPlanOfCareDialogState.patientId);
	const planOfCareId = $derived(ObservationPlanOfCareDialogState.planOfCareId);
	const isEdit = $derived(planOfCareId != null);

	let note = $state('');
	let statusIdStr = $state(String(StatusEnum.ACTIVE));
	let isSubmitting = $state(false);
	let loadSeq = 0;

	type PlanRow = {
		id: number;
		note: string | null;
		statusId: number | null;
	};

	async function apiGet<T>(mode: string, params?: Record<string, string>) {
		const hid = hospitalId;
		if (!hid) throw new Error('Hospital is required');
		const url = new URL(
			`/api/heka/hospital/${hid}/home/observation/emr`,
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
			`/api/heka/hospital/${hid}/home/observation/emr`,
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

	async function loadPlanForEdit(id: number, seq: number) {
		const row = await apiGet<PlanRow | null>('planOfCare.get', {
			id: String(id)
		});
		if (seq !== loadSeq) return;
		if (!row) {
			toastService.addToast(
				m.observation_emr_plan_of_care_not_found(),
				StatusColorEnum.ERROR
			);
			cancel();
			return;
		}
		note = row.note ?? '';
		statusIdStr = String(row.statusId ?? StatusEnum.ACTIVE);
	}

	$effect(() => {
		const vid = visitId;
		const pid = patientId;
		const id = planOfCareId;
		if (!vid || !pid) return;
		const seq = ++loadSeq;
		if (id == null) {
			note = '';
			statusIdStr = String(StatusEnum.ACTIVE);
			return;
		}
		void loadPlanForEdit(id, seq);
	});

	async function handleSubmit() {
		const vid = visitId;
		const pid = patientId;
		const hid = hospitalId;
		if (!vid || !pid || !hid) {
			toastService.addToast(
				m.observation_emr_visit_missing(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const trimmedNote = note.trim();
		if (!trimmedNote) {
			toastService.addToast(
				m.observation_emr_plan_of_care_note_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const statusId = Number(statusIdStr) || StatusEnum.ACTIVE;
		isSubmitting = true;
		try {
			if (isEdit && planOfCareId != null) {
				await apiPost('planOfCare.update', {
					payload: {
						id: planOfCareId,
						note: trimmedNote,
						statusId
					}
				});
			} else {
				await apiPost('planOfCare.create', {
					visitId: vid,
					note: trimmedNote,
					statusId
				});
			}
			toastSuccess(
				toastService,
				m.observation_emr_plan_of_care_note_label(),
				isEdit ? m.toast_action_updated() : m.toast_action_created()
			);
			ObservationPlanOfCareDialogState.onSaved?.();
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

<div
	class="flex max-h-[min(80vh,520px)] flex-col gap-4 overflow-y-auto px-2 py-3"
>
	<div class="flex flex-col gap-1">
		<DaisyUiLabel forText="plan-of-care-note" className="text-sm">
			{m.observation_emr_plan_of_care_note_label()}
		</DaisyUiLabel>
		<div class="py-0.5">
			<DaisyUiTextarea
				id="plan-of-care-note"
				className="d-textarea-bordered min-h-32 w-full"
				placeholder={m.observation_emr_note_placeholder()}
				bind:value={note}
			/>
		</div>
	</div>
	{#if isEdit}
		<div class="flex flex-col gap-1">
			<DaisyUiLabel forText="plan-of-care-status" className="text-sm">
				{m.observation_emr_status()}
			</DaisyUiLabel>
			<DaisyUiSelect
				name="plan-of-care-status"
				className="d-select-bordered w-full"
				bind:value={statusIdStr}
				disabled={isSubmitting}
			>
				<option value={String(StatusEnum.ACTIVE)}>Active</option>
				<option value={String(StatusEnum.INACTIVE)}>Inactive</option>
			</DaisyUiSelect>
		</div>
	{/if}
	<div class="flex flex-wrap justify-end gap-2">
		<DaisyUiButton
			type="button"
			className="d-btn-ghost"
			disabled={isSubmitting}
			onClick={cancel}
		>
			{m.observation_emr_cancel()}
		</DaisyUiButton>
		<DaisyUiButton
			type="button"
			className="d-btn d-btn-primary"
			disabled={isSubmitting}
			loading={isSubmitting}
			onClick={handleSubmit}
		>
			{m.observation_emr_save()}
		</DaisyUiButton>
	</div>
</div>
