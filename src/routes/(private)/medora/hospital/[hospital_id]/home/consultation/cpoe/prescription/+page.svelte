<script lang="ts">
	import { page } from '$app/state';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import type { CpoePrescriptionNoteListRow } from '$lib/model/type/medora/cpoe-prescription-note.type';
	import LCpoePrescriptionNoteDeleteDialogContent from '$lib/component/own/local/private/medora/consultation/LCpoePrescriptionNoteDeleteDialogContent.svelte';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { toastError, toastSuccess } from '$lib/util/toast-copy.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();
	const dateTimeUtil = new DateTimeUtil();
	const lifeCycleUtil = new LifeCycleUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	const visitIdStr = $derived(VisitState.visitId);
	const visitId = $derived(
		visitIdStr ? Number(visitIdStr) : 0
	);
	const readOnly = $derived(VisitState.isClinicalVisitReadOnly);
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/consultation/cpoe/prescription`
			: ''
	);

	let noteDraft = $state('');
	let notes = $state<CpoePrescriptionNoteListRow[]>([]);
	let editingNoteId = $state<number | null>(null);
	let editingNoteText = $state('');
	let isLoading = $state(false);
	let isSubmitting = $state(false);
	let isSavingEdit = $state(false);
	let loadSeq = 0;
	let mounted = $state(false);
	let lastLoadedVisitId = $state(0);

	const activeNotes = $derived(
		notes.filter(
			(row) =>
				row.statusId == null || row.statusId === StatusEnum.ACTIVE
		)
	);

	function isRowActive(row: CpoePrescriptionNoteListRow): boolean {
		return row.statusId == null || row.statusId === StatusEnum.ACTIVE;
	}

	async function apiGet<T>(
		mode: string,
		params: Record<string, string>
	): Promise<T> {
		const url = new URL(apiBase, window.location.origin);
		url.searchParams.set('mode', mode);
		for (const [k, v] of Object.entries(params)) {
			url.searchParams.set(k, v);
		}
		const res = await fetch(url.toString());
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	async function apiPost<T>(
		mode: string,
		body: Record<string, unknown>
	): Promise<T> {
		const res = await fetch(apiBase, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ mode, ...body })
		});
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	function doctorLabel(row: CpoePrescriptionNoteListRow): string {
		if (!row.doctor) return '';
		return StringUtil.doctorOptionDisplayName(row.doctor);
	}

	async function loadNotes() {
		const vid = visitId;
		if (!vid || !apiBase) {
			notes = [];
			return;
		}
		const seq = ++loadSeq;
		isLoading = true;
		try {
			const rows = await apiGet<CpoePrescriptionNoteListRow[]>(
				'prescriptionNote.list',
				{ visitId: String(vid) }
			);
			if (seq !== loadSeq) return;
			notes = rows;
		} catch (err) {
			if (seq !== loadSeq) return;
			toastError(
				toastService,
				msg.consultation_cpoe_prescription_title(),
				m.toast_action_loaded_failed(),
				err
			);
			notes = [];
		} finally {
			if (seq === loadSeq) isLoading = false;
		}
	}

	async function handleAddNote() {
		const vid = visitId;
		if (!vid || readOnly) return;
		const trimmed = noteDraft.trim();
		if (!trimmed) {
			toastService.addToast(
				msg.consultation_cpoe_prescription_note_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isSubmitting = true;
		try {
			await apiPost('prescriptionNote.create', {
				visitId: vid,
				note: trimmed
			});
			noteDraft = '';
			toastSuccess(
				toastService,
				msg.consultation_cpoe_prescription_title(),
				m.toast_action_created()
			);
			await loadNotes();
		} catch (err) {
			toastError(
				toastService,
				msg.consultation_cpoe_prescription_title(),
				m.toast_action_created_failed(),
				err
			);
		} finally {
			isSubmitting = false;
		}
	}

	function startEditNote(row: CpoePrescriptionNoteListRow) {
		if (readOnly || !isRowActive(row)) return;
		editingNoteId = row.id;
		editingNoteText = row.note ?? '';
	}

	function cancelEditNote() {
		editingNoteId = null;
		editingNoteText = '';
	}

	async function handleSaveEditNote(row: CpoePrescriptionNoteListRow) {
		if (readOnly || !isRowActive(row)) return;
		const trimmed = editingNoteText.trim();
		if (!trimmed) {
			toastService.addToast(
				msg.consultation_cpoe_prescription_note_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isSavingEdit = true;
		try {
			await apiPost('prescriptionNote.update', {
				id: row.id,
				note: trimmed
			});
			cancelEditNote();
			toastSuccess(
				toastService,
				msg.consultation_cpoe_prescription_title(),
				msg.consultation_cpoe_prescription_updated()
			);
			await loadNotes();
		} catch (err) {
			toastError(
				toastService,
				msg.consultation_cpoe_prescription_title(),
				m.toast_action_updated_failed(),
				err
			);
		} finally {
			isSavingEdit = false;
		}
	}

	async function handleDeleteNote(row: CpoePrescriptionNoteListRow) {
		if (readOnly || !isRowActive(row)) return;
		const result = await dialogService.open<{ deleteRemark?: string }>({
			title: msg.consultation_cpoe_prescription_delete_title(),
			component: LCpoePrescriptionNoteDeleteDialogContent,
			fullScreen: false,
			modalClassName: 'max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto'
		});
		if (!result.confirmed) return;
		try {
			await apiPost('prescriptionNote.delete', {
				id: row.id,
				deleteRemark: result.data?.deleteRemark ?? ''
			});
			if (editingNoteId === row.id) cancelEditNote();
			toastSuccess(
				toastService,
				msg.consultation_cpoe_prescription_title(),
				msg.consultation_cpoe_prescription_deleted()
			);
			await loadNotes();
		} catch (err) {
			toastError(
				toastService,
				msg.consultation_cpoe_prescription_title(),
				m.toast_action_deleted_failed(),
				err
			);
		}
	}

	$effect(() => {
		if (!mounted) return;
		if (visitId !== lastLoadedVisitId) {
			lastLoadedVisitId = visitId;
			void loadNotes();
		}
	});

	lifeCycleUtil.onMount(() => {
		mounted = true;
		if (visitId) void loadNotes();
	});

	lifeCycleUtil.onDestroy(() => {
		mounted = false;
	});
</script>

<div class="flex flex-col gap-4">
	<WashCard>
		<WashCardBody className="gap-4">
			<WashCardBodyTitle>
				{msg.consultation_cpoe_prescription_title()}
			</WashCardBodyTitle>

			{#if !visitId}
				<WashAlert
					type={StatusColorEnum.INFO}
					message={m.no_visit_selected()}
				/>
			{:else}
				<div class="flex flex-col gap-2">
					<label for="cpoe-prescription-note" class="text-sm">
						{msg.consultation_cpoe_prescription_note_label()}
					</label>
					<WashTextarea
						id="cpoe-prescription-note"
						className="textarea-bordered min-h-40 w-full"
						placeholder={msg.consultation_cpoe_prescription_note_placeholder()}
						bind:value={noteDraft}
						disabled={readOnly || isSubmitting}
					/>
					<div class="flex justify-end">
						<WashButton
							type="button"
							className="btn btn-primary"
							disabled={readOnly || isSubmitting || !noteDraft.trim()}
							loading={isSubmitting}
							onClick={handleAddNote}
						>
							{msg.consultation_cpoe_prescription_add()}
						</WashButton>
					</div>
				</div>
			{/if}
		</WashCardBody>
	</WashCard>

	{#if visitId}
		<WashCard>
			<WashCardBody className="gap-3">
				<WashCardBodyTitle>
					{msg.consultation_cpoe_prescription_saved_title()}
				</WashCardBodyTitle>

				{#if isLoading}
					<p class="text-sm opacity-70">{m.loading()}</p>
				{:else if activeNotes.length === 0}
					<p class="text-sm opacity-70">
						{msg.consultation_cpoe_prescription_empty()}
					</p>
				{:else}
					<ul class="flex flex-col gap-3">
						{#each activeNotes as row (row.id)}
							<li
								class="rounded-box border border-base-300 bg-base-100 p-4"
							>
								<div
									class="mb-2 flex flex-wrap items-start justify-between gap-2"
								>
									<div class="text-xs opacity-60">
										{#if row.createdAt}
											{dateTimeUtil.formatDateTime(row.createdAt)}
										{/if}
										{#if doctorLabel(row)}
											<span class="mx-1">·</span>
											{doctorLabel(row)}
										{/if}
									</div>
									{#if !readOnly}
										<div class="flex items-center gap-1">
											<button
												type="button"
												class="btn btn-ghost btn-xs text-success"
												aria-label={msg.consultation_cpoe_prescription_edit()}
												disabled={isSavingEdit &&
													editingNoteId === row.id}
												onclick={() => startEditNote(row)}
											>
												<LucidePencil className="size-4" />
											</button>
											<button
												type="button"
												class="btn btn-ghost btn-xs text-error"
												aria-label={msg.consultation_cpoe_prescription_delete_title()}
												disabled={editingNoteId === row.id}
												onclick={() => handleDeleteNote(row)}
											>
												<LucideTrash2 className="size-4" />
											</button>
										</div>
									{/if}
								</div>
								{#if editingNoteId === row.id}
									<div class="flex flex-col gap-2">
										<WashTextarea
											className="textarea-bordered min-h-32 w-full"
											bind:value={editingNoteText}
											disabled={isSavingEdit}
										/>
										<div class="flex justify-end gap-2">
											<WashButton
												type="button"
												className="btn-ghost btn-sm"
												disabled={isSavingEdit}
												onClick={cancelEditNote}
											>
												{m.observation_emr_cancel()}
											</WashButton>
											<WashButton
												type="button"
												className="btn btn-primary btn-sm"
												disabled={isSavingEdit ||
													!editingNoteText.trim()}
												loading={isSavingEdit}
												onClick={() => handleSaveEditNote(row)}
											>
												{msg.consultation_cpoe_prescription_save()}
											</WashButton>
										</div>
									</div>
								{:else}
									<p class="whitespace-pre-wrap text-sm">{row.note}</p>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</WashCardBody>
		</WashCard>
	{/if}
</div>
