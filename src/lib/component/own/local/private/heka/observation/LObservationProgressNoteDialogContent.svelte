<script lang="ts">
	import { page } from '$app/state';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationProgressNoteDialogState } from '$lib/state/observation-progress-note-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import type { StaffWithRelations } from '$lib/model/type/heka/staff.type';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiSearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const hospitalId = $derived(
		ObservationProgressNoteDialogState.hospitalId ??
			page.params.hospital_id ??
			''
	);
	const visitId = $derived(ObservationProgressNoteDialogState.visitId);
	const patientId = $derived(ObservationProgressNoteDialogState.patientId);
	const progressNoteId = $derived(
		ObservationProgressNoteDialogState.progressNoteId
	);
	const isEdit = $derived(progressNoteId != null);

	let note = $state('');
	let doctorIdInput = $state('');
	let statusIdStr = $state(String(StatusEnum.ACTIVE));
	let isSubmitting = $state(false);
	let loadSeq = 0;

	type NoteRow = {
		id: number;
		note: string | null;
		doctorId: string | null;
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

	async function searchDoctors(
		query: string
	): Promise<{ label: string; value: string }[]> {
		const hid = hospitalId;
		if (!hid) return [];
		const res = await apiGet<{ data: StaffWithRelations[] }>(
			'doctor.search',
			{
				search: query.trim(),
				page: '1',
				pageSize: String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT)
			}
		);
		return res.data.map((staff: StaffWithRelations) => ({
			label: StringUtil.doctorOptionDisplayName(staff),
			value: String(staff.id)
		}));
	}

	async function getDoctorLabelForValue(id: string): Promise<string> {
		const staff = await apiGet<StaffWithRelations | null>('staff.get', {
			id
		});
		if (!staff) return '';
		return StringUtil.doctorOptionDisplayName(staff);
	}

	async function loadNoteForEdit(id: number, seq: number) {
		const row = await apiGet<NoteRow | null>('progressNote.get', {
			id: String(id)
		});
		if (seq !== loadSeq) return;
		if (!row) {
			toastService.addToast(
				m.observation_emr_progress_note_not_found(),
				StatusColorEnum.ERROR
			);
			cancel();
			return;
		}
		note = row.note ?? '';
		doctorIdInput = row.doctorId?.trim() ? String(row.doctorId) : '';
		statusIdStr = String(row.statusId ?? StatusEnum.ACTIVE);
	}

	$effect(() => {
		const vid = visitId;
		const pid = patientId;
		const id = progressNoteId;
		if (!vid || !pid) return;
		const seq = ++loadSeq;
		if (id == null) {
			note = '';
			doctorIdInput = '';
			statusIdStr = String(StatusEnum.ACTIVE);
			return;
		}
		void loadNoteForEdit(id, seq);
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
				m.observation_emr_progress_note_note_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const statusId = Number(statusIdStr) || StatusEnum.ACTIVE;
		isSubmitting = true;
		try {
			if (isEdit && progressNoteId != null) {
				await apiPost('progressNote.update', {
					payload: {
						id: progressNoteId,
						note: trimmedNote,
						doctorId:
							doctorIdInput.trim() !== '' ? doctorIdInput.trim() : null,
						statusId
					}
				});
			} else {
				await apiPost('progressNote.create', {
					visitId: vid,
					note: trimmedNote,
					doctorId:
						doctorIdInput.trim() !== '' ? doctorIdInput.trim() : null,
					statusId
				});
			}
			toastSuccess(
				toastService,
				m.observation_emr_progress_note(),
				isEdit ? m.toast_action_updated() : m.toast_action_created()
			);
			ObservationProgressNoteDialogState.onSaved?.();
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
		<DaisyUiLabel forText="progress-note-body" className="text-sm">
			{m.observation_emr_progress_note_note_label()}
		</DaisyUiLabel>
		<div class="py-0.5">
			<DaisyUiTextarea
				id="progress-note-body"
				className="d-textarea-bordered min-h-32 w-full"
				placeholder={m.observation_emr_note_placeholder()}
				bind:value={note}
			/>
		</div>
	</div>
	<div class="flex flex-col gap-1">
		<DaisyUiLabel className="text-sm" forText="progress-note-doctor">
			{m.observation_emr_advising_doctor()}
		</DaisyUiLabel>
		<DaisyUiSearchSelect
			inputId="progress-note-doctor"
			className="w-full"
			placement="up"
			bind:value={doctorIdInput}
			searchFn={searchDoctors}
			getLabelForValue={getDoctorLabelForValue}
			placeholder={m.observation_emr_search_doctor()}
			disabled={isSubmitting}
		/>
	</div>
	{#if isEdit}
		<div class="flex flex-col gap-1">
			<DaisyUiLabel forText="progress-note-status" className="text-sm">
				{m.observation_emr_status()}
			</DaisyUiLabel>
			<DaisyUiSelect
				name="progress-note-status"
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
