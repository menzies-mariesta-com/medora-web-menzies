<script lang="ts">
	import { page } from '$app/state';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationDiagnosisDialogState } from '$lib/state/observation-diagnosis-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import type { DiagnosisCodeOption } from '$lib/model/type/medora/clinical.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { onMount } from 'svelte';

	const toastService = new ToastService();

	let { confirm, cancel }: DialogSlotProps = $props();

	const hospitalId = $derived(page.params.hospital_id ?? '');

	const visitId = $derived(ObservationDiagnosisDialogState.visitId);
	const branchId = $derived(ObservationDiagnosisDialogState.branchId);
	const patientId = $derived(
		ObservationDiagnosisDialogState.patientId
	);
	const diagnosisId = $derived(
		ObservationDiagnosisDialogState.diagnosisId
	);
	const isEdit = $derived(diagnosisId != null);

	type DiagnosisType = {
		id: number;
		name: string | null;
	};

	type DiagnosisRow = {
		id: number;
		diagnosisTypeId: number | null;
		diagnosisCodeId: number | null;
		description: string | null;
		statusId: number | null;
		diagnosisCode?: DiagnosisCodeOption | null;
	};

	let types = $state<DiagnosisType[]>([]);
	let diagnosisCodeOptions = $state<DiagnosisCodeOption[]>([]);
	let selectedDiagnosisTypeIds = $state<number[]>([]);
	let diagnosisCodeId = $state('');
	let description = $state('');
	let statusIdStr = $state(String(StatusEnum.ACTIVE));
	let isSubmitting = $state(false);
	let loadSeq = 0;

	const allDiagnosisTypesSelected = $derived(
		types.length > 0 &&
			selectedDiagnosisTypeIds.length === types.length
	);

	function resetDiagnosisForm() {
		selectedDiagnosisTypeIds = [];
		diagnosisCodeId = '';
		description = '';
		statusIdStr = String(StatusEnum.ACTIVE);
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

	async function loadDiagnosisTypes() {
		const rows = await apiGet<DiagnosisType[]>('diagnosis.types');
		types = rows;
	}

	async function searchDiagnosisCodes(query: string) {
		const rows = await apiGet<DiagnosisCodeOption[]>(
			'diagnosisCode.search',
			{
				search: query,
				limit: '30'
			}
		);
		diagnosisCodeOptions = rows;
		return rows.map((row) => ({
			value: String(row.id),
			label: `${row.code} — ${row.description}`
		}));
	}

	async function getDiagnosisCodeLabel(
		value: string
	): Promise<string> {
		const row = diagnosisCodeOptions.find(
			(item) => String(item.id) === value
		);
		if (row) {
			description = row.description;
			return `${row.code} — ${row.description}`;
		}
		return description || value;
	}

	function handleDiagnosisCodeChange(value: string) {
		diagnosisCodeId = value;
		if (!value) {
			description = '';
			return;
		}
		const row = diagnosisCodeOptions.find(
			(item) => String(item.id) === value
		);
		description = row?.description ?? '';
	}

	async function loadDiagnosisByIdForEdit(did: number, seq: number) {
		const row = await apiGet<DiagnosisRow | null>('diagnosis.get', {
			id: String(did)
		});
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
		diagnosisCodeId = row.diagnosisCodeId
			? String(row.diagnosisCodeId)
			: '';
		description = row.description ?? '';
		if (row.diagnosisCode) diagnosisCodeOptions = [row.diagnosisCode];
		statusIdStr = String(row.statusId ?? StatusEnum.ACTIVE);
	}

	onMount(() => {
		void loadDiagnosisTypes();
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
		const selectedCodeId = Number(diagnosisCodeId);
		if (!Number.isFinite(selectedCodeId) || selectedCodeId <= 0) {
			toastService.addToast(
				m.mo_clinical_diagnosis_code_required(),
				StatusColorEnum.ERROR
			);
			return;
		}

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
				await apiPost('diagnosis.update', {
					payload: {
						id: diagnosisId,
						diagnosisTypeId: typeId,
						diagnosisCodeId: selectedCodeId,
						statusId
					}
				});
			} else {
				// Backend requires a single `diagnosisTypeId` per diagnosis record.
				// In add mode, create one record per selected type.
				for (const diagnosisTypeId of selectedTypeIds) {
					await apiPost('diagnosis.create', {
						payload: {
							branchId: bid,
							patientId: pid,
							visitId: vid,
							diagnosisTypeId,
							diagnosisCodeId: selectedCodeId,
							statusId
						}
					});
				}
			}
			toastSuccess(
				toastService,
				m.entity_patient_diagnosis(),
				isEdit ? m.toast_action_updated() : m.toast_action_created()
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
			<label class="label cursor-pointer justify-start gap-3">
				<input
					type="checkbox"
					name="diagnosis-type-id-all"
					class="checkbox checkbox-sm checkbox-primary shrink-0"
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
				<label class="label cursor-pointer justify-start gap-3">
					<input
						type="checkbox"
						name="diagnosis-type-id"
						class="checkbox checkbox-sm checkbox-primary shrink-0"
						value={String(t.id)}
						checked={selectedDiagnosisTypeIds.includes(Number(t.id))}
						disabled={isSubmitting}
						onchange={(event) => {
							const checked = (
								event.currentTarget as HTMLInputElement
							).checked;
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
								selectedDiagnosisTypeIds =
									selectedDiagnosisTypeIds.filter(
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
		<label for="diagnosis-code">
			{m.mo_clinical_diagnosis_code()}
			<span class="text-error">*</span>
		</label>
		<SearchSelect
			inputId="diagnosis-code"
			bind:value={diagnosisCodeId}
			placeholder={m.mo_clinical_diagnosis_code_search()}
			searchFn={searchDiagnosisCodes}
			getLabelForValue={getDiagnosisCodeLabel}
			onChange={handleDiagnosisCodeChange}
			minSearchLength={0}
			disabled={isSubmitting}
		/>
	</div>

	<div class="rounded-box border border-base-300 bg-base-200/40 p-3">
		<div class="text-xs font-medium uppercase opacity-60">
			{m.mo_clinical_description()}
		</div>
		<p class="mt-1 text-sm">
			{description || m.mo_clinical_diagnosis_code_required()}
		</p>
	</div>

	{#if isEdit}
		<div class="flex flex-col gap-1">
			<label for="diagnosis-status">
				{m.observation_emr_status()}
			</label>
			<WashSelect
				name="diagnosis-status"
				className="select-bordered w-full"
				bind:value={statusIdStr}
				disabled={isSubmitting}
			>
				<option value={String(StatusEnum.ACTIVE)}>Active</option>
				<option value={String(StatusEnum.INACTIVE)}>Inactive</option>
			</WashSelect>
		</div>
	{/if}

	<div class="flex flex-wrap justify-end gap-2 pt-2">
		<WashButton
			type="button"
			className="btn btn-ghost"
			disabled={isSubmitting}
			onClick={() => dialogService.cancel()}
		>
			{m.observation_emr_cancel()}
		</WashButton>
		<WashButton
			type="button"
			className="btn btn-primary"
			disabled={isSubmitting}
			loading={isSubmitting}
			onClick={() => void handleSubmit()}
		>
			{m.observation_emr_save()}
		</WashButton>
	</div>
</div>
