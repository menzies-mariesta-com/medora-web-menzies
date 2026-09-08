<script lang="ts">
	import { page } from '$app/state';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationPlanOfCareDialogState } from '$lib/state/observation-plan-of-care-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
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
	const patientId = $derived(
		ObservationPlanOfCareDialogState.patientId
	);
	const planOfCareId = $derived(
		ObservationPlanOfCareDialogState.planOfCareId
	);
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
		<label for="plan-of-care-note" class="text-sm">
			{m.observation_emr_plan_of_care_note_label()}
		</label>
		<div class="py-0.5">
			<WashTextarea
				id="plan-of-care-note"
				className="textarea-bordered min-h-32 w-full"
				placeholder={m.observation_emr_note_placeholder()}
				bind:value={note}
			/>
		</div>
	</div>
	{#if isEdit}
		<div class="flex flex-col gap-1">
			<label for="plan-of-care-status" class="text-sm">
				{m.observation_emr_status()}
			</label>
			<WashSelect
				name="plan-of-care-status"
				className="select-bordered w-full"
				bind:value={statusIdStr}
				disabled={isSubmitting}
			>
				<option value={String(StatusEnum.ACTIVE)}>Active</option>
				<option value={String(StatusEnum.INACTIVE)}>Inactive</option>
			</WashSelect>
		</div>
	{/if}
	<div class="flex flex-wrap justify-end gap-2">
		<WashButton
			type="button"
			className="btn-ghost"
			disabled={isSubmitting}
			onClick={cancel}
		>
			{m.observation_emr_cancel()}
		</WashButton>
		<WashButton
			type="button"
			className="btn btn-primary"
			disabled={isSubmitting}
			loading={isSubmitting}
			onClick={handleSubmit}
		>
			{m.observation_emr_save()}
		</WashButton>
	</div>
</div>
