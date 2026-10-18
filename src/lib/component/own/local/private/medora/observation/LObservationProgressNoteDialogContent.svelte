<script lang="ts">
	import { page } from '$app/state';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationProgressNoteDialogState } from '$lib/state/observation-progress-note-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import type { StaffWithRelations } from '$lib/model/type/medora/staff.type';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const toastService = new ToastService();
	const msg = m as Record<string, (inputs?: object) => string>;

	let { confirm, cancel }: DialogSlotProps = $props();

	const hospitalId = $derived(
		ObservationProgressNoteDialogState.hospitalId ??
			page.params.hospital_id ??
			''
	);
	const visitId = $derived(
		ObservationProgressNoteDialogState.visitId
	);
	const patientId = $derived(
		ObservationProgressNoteDialogState.patientId
	);
	const progressNoteId = $derived(
		ObservationProgressNoteDialogState.progressNoteId
	);
	const isEdit = $derived(progressNoteId != null);

	let subjective = $state('');
	let objective = $state('');
	let assessment = $state('');
	let plan = $state('');
	let doctorIdInput = $state('');
	let statusIdStr = $state(String(StatusEnum.ACTIVE));
	let isSubmitting = $state(false);
	let isSigning = $state(false);
	let signedAt = $state<string | null>(null);
	let addendumBody = $state('');
	let addendumReason = $state('correction');
	let isAddendumSubmitting = $state(false);
	let loadSeq = 0;

	type NoteRow = {
		id: number;
		note: string | null;
		subjective?: string | null;
		objective?: string | null;
		assessment?: string | null;
		plan?: string | null;
		doctorId: string | null;
		statusId: number | null;
		signedAt?: string | null;
	};

	function composeNote(): string {
		const parts = [
			subjective.trim() ? `S: ${subjective.trim()}` : '',
			objective.trim() ? `O: ${objective.trim()}` : '',
			assessment.trim() ? `A: ${assessment.trim()}` : '',
			plan.trim() ? `P: ${plan.trim()}` : ''
		].filter(Boolean);
		return parts.join('\n');
	}

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
		if (!res.ok) await throwUserFacingHttpError(res);
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
		if (!res.ok) await throwUserFacingHttpError(res);
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
		const staff = await apiGet<StaffWithRelations | null>(
			'staff.get',
			{ id }
		);
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
		subjective = row.subjective ?? '';
		objective = row.objective ?? '';
		assessment = row.assessment ?? '';
		plan = row.plan ?? '';
		if (
			!subjective &&
			!objective &&
			!assessment &&
			!plan &&
			row.note
		) {
			subjective = row.note;
		}
		doctorIdInput = row.doctorId?.trim() ? String(row.doctorId) : '';
		statusIdStr = String(row.statusId ?? StatusEnum.ACTIVE);
		signedAt = row.signedAt ?? null;
	}

	$effect(() => {
		const vid = visitId;
		const pid = patientId;
		const id = progressNoteId;
		if (!vid || !pid) return;
		const seq = ++loadSeq;
		if (id == null) {
			subjective = '';
			objective = '';
			assessment = '';
			plan = '';
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
		const composed = composeNote();
		if (!composed) {
			toastService.addToast(
				m.observation_emr_progress_note_note_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const statusId = Number(statusIdStr) || StatusEnum.ACTIVE;
		isSubmitting = true;
		try {
			const soap = {
				note: composed,
				subjective: subjective.trim() || null,
				objective: objective.trim() || null,
				assessment: assessment.trim() || null,
				plan: plan.trim() || null,
				doctorId:
					doctorIdInput.trim() !== '' ? doctorIdInput.trim() : null,
				statusId
			};
			if (isEdit && progressNoteId != null) {
				await apiPost('progressNote.update', {
					payload: { id: progressNoteId, ...soap }
				});
			} else {
				await apiPost('progressNote.create', {
					visitId: vid,
					...soap
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

	async function handleSign() {
		const id = progressNoteId;
		if (id == null) return;
		isSigning = true;
		try {
			await apiPost('progressNote.sign', { id });
			signedAt = new Date().toISOString();
			toastSuccess(
				toastService,
				m.observation_emr_progress_note(),
				msg.clinical_sign_progress_note()
			);
			ObservationProgressNoteDialogState.onSaved?.();
		} catch (err) {
			toastService.addErrorToast(
				msg.clinical_sign_progress_note(),
				err
			);
		} finally {
			isSigning = false;
		}
	}

	async function handleAddendum() {
		const id = progressNoteId;
		if (id == null || !addendumBody.trim()) return;
		isAddendumSubmitting = true;
		try {
			await apiPost('progressNote.addendum.create', {
				progressNoteId: id,
				reasonCode: addendumReason,
				body: addendumBody.trim()
			});
			addendumBody = '';
			toastSuccess(
				toastService,
				m.observation_emr_progress_note(),
				msg.clinical_addendum()
			);
			ObservationProgressNoteDialogState.onSaved?.();
		} catch (err) {
			toastService.addErrorToast(msg.clinical_addendum(), err);
		} finally {
			isAddendumSubmitting = false;
		}
	}
</script>

<div
	class="flex max-h-[min(80vh,640px)] flex-col gap-4 overflow-y-auto px-2 py-3"
>
	{#each [
		{
			id: 'progress-note-s',
			label: 'Subjective (S)',
			bindKey: 'subjective' as const
		},
		{
			id: 'progress-note-o',
			label: 'Objective (O)',
			bindKey: 'objective' as const
		},
		{
			id: 'progress-note-a',
			label: 'Assessment (A)',
			bindKey: 'assessment' as const
		},
		{
			id: 'progress-note-p',
			label: 'Plan (P)',
			bindKey: 'plan' as const
		}
	] as field (field.id)}
		<div class="flex flex-col gap-1">
			<label for={field.id} class="text-sm">{field.label}</label>
			<div class="py-0.5">
				{#if field.bindKey === 'subjective'}
					<WashTextarea
						id={field.id}
						className="textarea-bordered min-h-20 w-full"
						placeholder={m.observation_emr_note_placeholder()}
						bind:value={subjective}
					/>
				{:else if field.bindKey === 'objective'}
					<WashTextarea
						id={field.id}
						className="textarea-bordered min-h-20 w-full"
						placeholder={m.observation_emr_note_placeholder()}
						bind:value={objective}
					/>
				{:else if field.bindKey === 'assessment'}
					<WashTextarea
						id={field.id}
						className="textarea-bordered min-h-20 w-full"
						placeholder={m.observation_emr_note_placeholder()}
						bind:value={assessment}
					/>
				{:else}
					<WashTextarea
						id={field.id}
						className="textarea-bordered min-h-20 w-full"
						placeholder={m.observation_emr_note_placeholder()}
						bind:value={plan}
					/>
				{/if}
			</div>
		</div>
	{/each}
	<div class="flex flex-col gap-1">
		<label for="progress-note-doctor" class="text-sm">
			{m.observation_emr_advising_doctor()}
		</label>
		<SearchSelect
			inputId="progress-note-doctor"
			className="w-full"
			bind:value={doctorIdInput}
			searchFn={searchDoctors}
			getLabelForValue={getDoctorLabelForValue}
			placeholder={m.observation_emr_search_doctor()}
			disabled={isSubmitting}
		/>
	</div>
	{#if isEdit && !signedAt}
		<div class="flex flex-col gap-1">
			<label for="progress-note-status" class="text-sm">
				{m.observation_emr_status()}
			</label>
			<WashSelect
				name="progress-note-status"
				className="select-bordered w-full"
				bind:value={statusIdStr}
				disabled={isSubmitting}
			>
				<option value={String(StatusEnum.ACTIVE)}>Active</option>
				<option value={String(StatusEnum.INACTIVE)}>Inactive</option>
			</WashSelect>
		</div>
	{/if}
	{#if signedAt}
		<p class="text-success text-sm">{msg.clinical_sign_progress_note()}: {signedAt}</p>
		<div class="flex flex-col gap-1">
			<label for="addendum-body" class="text-sm">{msg.clinical_addendum()}</label>
			<WashTextarea
				id="addendum-body"
				className="textarea-bordered min-h-16 w-full"
				bind:value={addendumBody}
			/>
		</div>
	{/if}
</div>
<WashDialogFooter>
	<WashButton
		type="button"
		className="btn-ghost"
		disabled={isSubmitting}
		onClick={cancel}
	>
		{m.observation_emr_cancel()}
	</WashButton>
	{#if isEdit && !signedAt}
		<WashButton
			type="button"
			className="btn btn-secondary cursor-pointer"
			loading={isSigning}
			disabled={isSubmitting || isSigning}
			onClick={handleSign}
		>
			{msg.clinical_sign_progress_note()}
		</WashButton>
	{/if}
	{#if signedAt}
		<WashButton
			type="button"
			className="btn btn-primary cursor-pointer"
			loading={isAddendumSubmitting}
			disabled={isAddendumSubmitting || !addendumBody.trim()}
			onClick={handleAddendum}
		>
			{msg.clinical_addendum()}
		</WashButton>
	{:else}
		<WashButton
			type="button"
			className="btn btn-primary cursor-pointer"
			loading={isSubmitting}
			disabled={isSubmitting || isSigning}
			onClick={handleSubmit}
		>
			{m.observation_emr_save()}
		</WashButton>
	{/if}
</WashDialogFooter>
