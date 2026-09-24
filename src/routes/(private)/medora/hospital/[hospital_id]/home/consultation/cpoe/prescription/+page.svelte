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
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import {
		toastError,
		toastSuccess
	} from '$lib/util/toast-copy.util';
	import { m } from '$lib/paraglide/messages';
	import type {
		MedicationOrderMastersResponse,
		StoreSearchRow
	} from '$lib/model/type/medora/medication-order.type';

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
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);
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
	let masters = $state<MedicationOrderMastersResponse | null>(null);
	let storeId = $state('');
	let isSavingDraft = $state(false);
	let nextLineKey = 1;

	type MedicationItem = { id: number; itemName: string };
	type DraftLine = {
		key: number;
		itemMasterId: string;
		dose: string;
		doseUnitId: string;
		frequencyId: string;
		durationValue: string;
		durationUnitId: string;
		formId: string;
		routeId: string;
		orderTypeId: string;
		foodRelationId: string;
		startAt: string;
		lineRemarks: string;
	};

	function blankLine(): DraftLine {
		return {
			key: nextLineKey++,
			itemMasterId: '',
			dose: '',
			doseUnitId: '',
			frequencyId: '',
			durationValue: '',
			durationUnitId: '',
			formId: '',
			routeId: '',
			orderTypeId: '',
			foodRelationId: '',
			startAt: new Date().toISOString().slice(0, 16),
			lineRemarks: ''
		};
	}

	let medicationLines = $state<DraftLine[]>([blankLine()]);

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

	async function loadMedicationMasters() {
		if (!apiBase) return;
		masters = await apiGet<MedicationOrderMastersResponse>(
			'medication.masters',
			{}
		);
	}

	async function searchStores(query: string) {
		const rows = await apiGet<StoreSearchRow[]>('medication.stores', {
			search: query
		});
		return rows.map((row) => ({
			value: String(row.id),
			label:
				row.storeName ??
				msg.mo_clinical_store_number({ number: row.id })
		}));
	}

	async function searchMedicationItems(query: string) {
		const rows = await apiGet<MedicationItem[]>('medication.items', {
			search: query
		});
		return rows.map((row) => ({
			value: String(row.id),
			label: row.itemName
		}));
	}

	function removeMedicationLine(key: number) {
		if (medicationLines.length === 1) return;
		medicationLines = medicationLines.filter(
			(line) => line.key !== key
		);
	}

	async function saveMedicationDraft() {
		if (!visitId || !storeId || readOnly) return;
		const invalid = medicationLines.some(
			(line) =>
				!line.itemMasterId ||
				!line.dose.trim() ||
				!line.doseUnitId ||
				!line.frequencyId ||
				!line.durationValue.trim() ||
				!line.durationUnitId
		);
		if (invalid) {
			toastService.addToast(
				msg.mo_clinical_medication_required_error(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isSavingDraft = true;
		try {
			await apiPost('medication.createDraft', {
				visitId,
				storeId: Number(storeId),
				lines: medicationLines.map((line) => ({
					itemMasterId: Number(line.itemMasterId),
					dose: line.dose.trim(),
					doseUnitId: Number(line.doseUnitId),
					frequencyId: Number(line.frequencyId),
					durationValue: line.durationValue.trim(),
					durationUnitId: Number(line.durationUnitId),
					formId: line.formId ? Number(line.formId) : null,
					routeId: line.routeId ? Number(line.routeId) : null,
					orderTypeId: line.orderTypeId
						? Number(line.orderTypeId)
						: null,
					foodRelationId: line.foodRelationId
						? Number(line.foodRelationId)
						: null,
					startAt: line.startAt
						? new Date(line.startAt).toISOString()
						: undefined,
					lineRemarks: line.lineRemarks.trim() || null
				}))
			});
			medicationLines = [blankLine()];
			toastService.addToast(
				msg.mo_clinical_medication_created(),
				StatusColorEnum.SUCCESS
			);
		} catch (error) {
			toastService.addErrorToast(
				msg.mo_clinical_medication_create_failed(),
				error
			);
		} finally {
			isSavingDraft = false;
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

	async function handleSaveEditNote(
		row: CpoePrescriptionNoteListRow
	) {
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
		const result = await dialogService.open<{
			deleteRemark?: string;
		}>({
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

	lifeCycleUtil.onMount(() => {
		if (visitId) {
			void loadNotes();
			void loadMedicationMasters();
		}
	});
</script>

<div class="flex flex-col gap-4">
	<WashCard>
		<WashCardBody className="gap-4">
			<WashCardBodyTitle>
				{msg.mo_clinical_medication_draft_title()}
			</WashCardBodyTitle>
			{#if !visitId}
				<WashAlert
					type={StatusColorEnum.INFO}
					message={m.no_visit_selected()}
				/>
			{:else}
				<div class="grid gap-3 md:grid-cols-2">
					<label class="flex flex-col gap-1 text-sm">
						<span>
							{msg.mo_clinical_dispensing_store()}
							<span class="text-error">*</span>
						</span>
						<SearchSelect
							bind:value={storeId}
							placeholder={msg.mo_clinical_search_store()}
							searchFn={searchStores}
							minSearchLength={0}
							disabled={readOnly || isSavingDraft}
						/>
					</label>
				</div>

				<div class="flex flex-col gap-3">
					{#each medicationLines as line, index (line.key)}
						<fieldset class="rounded-box border border-base-300 p-3">
							<div
								class="mb-3 flex items-center justify-between gap-2"
							>
								<legend class="font-medium">
									{msg.mo_clinical_medication_number({
										number: index + 1
									})}
								</legend>
								<WashButton
									type="button"
									className="btn-ghost btn-xs text-error"
									disabled={readOnly || medicationLines.length === 1}
									onClick={() => removeMedicationLine(line.key)}
								>
									{msg.mo_clinical_remove()}
								</WashButton>
							</div>
							<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
								<label
									class="flex flex-col gap-1 text-sm md:col-span-2"
								>
									<span>
										{msg.mo_clinical_item()}
										<span class="text-error">*</span>
									</span>
									<SearchSelect
										bind:value={line.itemMasterId}
										placeholder={msg.mo_clinical_search_medication()}
										searchFn={searchMedicationItems}
										minSearchLength={0}
										disabled={readOnly || isSavingDraft}
									/>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									<span>
										{msg.mo_clinical_dose()}
										<span class="text-error">*</span>
									</span>
									<WashInputField
										bind:value={line.dose}
										inputType="text"
										inputPlaceholderText={msg.mo_clinical_dose_placeholder()}
										disabled={readOnly || isSavingDraft}
									/>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									<span>
										{msg.mo_clinical_dose_unit()}
										<span class="text-error">*</span>
									</span>
									<WashSelect
										bind:value={line.doseUnitId}
										placeholder={msg.mo_clinical_choose_unit()}
										disabled={readOnly || isSavingDraft}
									>
										{#each masters?.doseUnits ?? [] as option (option.id)}
											<option value={String(option.id)}
												>{option.name ?? '–'}</option
											>
										{/each}
									</WashSelect>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									<span>
										{msg.mo_clinical_frequency()}
										<span class="text-error">*</span>
									</span>
									<WashSelect
										bind:value={line.frequencyId}
										placeholder={msg.mo_clinical_choose_frequency()}
										disabled={readOnly || isSavingDraft}
									>
										{#each masters?.freqs ?? [] as option (option.id)}
											<option value={String(option.id)}
												>{option.label ??
													option.summaryText ??
													'–'}</option
											>
										{/each}
									</WashSelect>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									<span>
										{msg.mo_clinical_duration()}
										<span class="text-error">*</span>
									</span>
									<WashInputField
										bind:value={line.durationValue}
										inputType="number"
										inputPlaceholderText={msg.mo_clinical_duration()}
										min="1"
										disabled={readOnly || isSavingDraft}
									/>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									<span>
										{msg.mo_clinical_duration_unit()}
										<span class="text-error">*</span>
									</span>
									<WashSelect
										bind:value={line.durationUnitId}
										placeholder={msg.mo_clinical_choose_unit()}
										disabled={readOnly || isSavingDraft}
									>
										{#each masters?.durUnits ?? [] as option (option.id)}
											<option value={String(option.id)}
												>{option.name ?? option.code}</option
											>
										{/each}
									</WashSelect>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									<span>{msg.mo_clinical_start()}</span>
									<WashInputField
										bind:value={line.startAt}
										inputType="datetime-local"
										disabled={readOnly || isSavingDraft}
									/>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									<span>{msg.mo_clinical_form()}</span>
									<WashSelect
										bind:value={line.formId}
										placeholder={msg.mo_clinical_optional()}
									>
										{#each masters?.forms ?? [] as option (option.id)}
											<option value={String(option.id)}
												>{option.name ?? '–'}</option
											>
										{/each}
									</WashSelect>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									<span>{msg.mo_clinical_route()}</span>
									<WashSelect
										bind:value={line.routeId}
										placeholder={msg.mo_clinical_optional()}
									>
										{#each masters?.routes ?? [] as option (option.id)}
											<option value={String(option.id)}
												>{option.name ?? '–'}</option
											>
										{/each}
									</WashSelect>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									<span>{msg.mo_clinical_order_type()}</span>
									<WashSelect
										bind:value={line.orderTypeId}
										placeholder={msg.mo_clinical_optional()}
									>
										{#each masters?.orderTypes ?? [] as option (option.id)}
											<option value={String(option.id)}
												>{option.name ?? '–'}</option
											>
										{/each}
									</WashSelect>
								</label>
								<label class="flex flex-col gap-1 text-sm">
									<span>{msg.mo_clinical_food_relation()}</span>
									<WashSelect
										bind:value={line.foodRelationId}
										placeholder={msg.mo_clinical_optional()}
									>
										{#each masters?.foodRels ?? [] as option (option.id)}
											<option value={String(option.id)}
												>{option.name ?? '–'}</option
											>
										{/each}
									</WashSelect>
								</label>
								<label
									class="flex flex-col gap-1 text-sm md:col-span-2"
								>
									<span>{msg.mo_clinical_remarks()}</span>
									<WashInputField
										bind:value={line.lineRemarks}
										inputType="text"
										inputPlaceholderText={msg.mo_clinical_optional_instructions()}
									/>
								</label>
							</div>
						</fieldset>
					{/each}
				</div>

				<div class="flex flex-wrap justify-end gap-2">
					<WashButton
						type="button"
						className="btn-outline"
						disabled={readOnly || isSavingDraft}
						onClick={() =>
							(medicationLines = [...medicationLines, blankLine()])}
					>
						{msg.mo_clinical_add_medication()}
					</WashButton>
					<WashButton
						type="button"
						className="btn-primary"
						disabled={readOnly || isSavingDraft || !storeId}
						loading={isSavingDraft}
						onClick={saveMedicationDraft}
					>
						{msg.mo_clinical_save_draft()}
					</WashButton>
				</div>
			{/if}
		</WashCardBody>
	</WashCard>

	<WashCard>
		<WashCardBody className="gap-4">
			<WashCardBodyTitle>
				{msg.mo_clinical_free_text_notes()}
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
									<p class="text-sm whitespace-pre-wrap">
										{row.note}
									</p>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</WashCardBody>
		</WashCard>
	{/if}
</div>
