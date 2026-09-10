<script lang="ts">
	import { page } from '$app/state';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { PatientAllergyDialogState } from '$lib/state/patient-allergy-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DeactivationRemarkDialogState } from '$lib/state/deactivation-remark-dialog.state.svelte';
	import { AllergyEnum, StatusEnum } from '$lib/model/enum/db-link';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import LDeactivationRemarkDialogContent from './LDeactivationRemarkDialogContent.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastInfo, toastSuccess } from '$lib/util/toast-copy.util';

	const toastService = new ToastService();

	type DeactivationRemarkResult = { deactivationRemark: string };

	type AllergyRow = { id: number; name?: string | null };
	type SeverityRow = { id: number; name?: string | null };
	type PatientAllergyRow = {
		id: number;
		allergyId: number;
		severityId: number;
		statusId: number;
		reaction?: string | null;
		remark?: string | null;
		deactivationRemark?: string | null;
	};

	let { confirm, cancel }: DialogSlotProps = $props();

	const patientId = $derived(PatientAllergyDialogState.patientId);
	const visitId = $derived(PatientAllergyDialogState.visitId);
	const patientAllergyId = $derived(
		PatientAllergyDialogState.patientAllergyId
	);
	const isEditMode = $derived(!!patientAllergyId);

	const hospitalIdEffective = $derived(
		(
			PatientAllergyDialogState.hospitalId?.trim() ||
			(typeof page.params?.hospital_id === 'string'
				? page.params.hospital_id
				: '')
		).trim()
	);

	function obsEmrBase(): string {
		const h = hospitalIdEffective;
		if (!h) return '';
		return `/api/medora/hospital/${encodeURIComponent(h)}/home/consultation/emr`;
	}

	function emrMutationBase(): string {
		const h = hospitalIdEffective;
		if (!h) return '';
		if (PatientAllergyDialogState.emrMutationViaNursingWorkbench) {
			return `/api/medora/hospital/${encodeURIComponent(h)}/home/nursing-workbench/emr/allergy`;
		}
		return obsEmrBase();
	}

	async function parseApi(res: Response): Promise<unknown> {
		const text = await res.text();
		let data: unknown;
		try {
			data = text ? JSON.parse(text) : null;
		} catch {
			throw new Error(text || res.statusText);
		}
		if (!res.ok) {
			const d = data as { message?: string; error?: string } | null;
			const msg =
				(typeof d?.message === 'string' && d.message) ||
				(typeof d?.error === 'string' && d.error) ||
				text ||
				res.statusText;
			throw new Error(msg);
		}
		return data;
	}

	async function emrPost(
		body: Record<string, unknown>
	): Promise<unknown> {
		const base = emrMutationBase();
		if (!base) throw new Error('Hospital context missing.');
		const r = await fetch(base, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		return parseApi(r);
	}

	async function fetchAllergyMasterList(): Promise<AllergyRow[]> {
		const base = obsEmrBase();
		if (!base) return [];
		const r = await fetch(`${base}?mode=allergyMaster.list`);
		return (await parseApi(r)) as AllergyRow[];
	}

	async function fetchSeverities(): Promise<SeverityRow[]> {
		const r = await fetch('/api/medora/master/lookup?kind=severity');
		return (await parseApi(r)) as SeverityRow[];
	}

	async function fetchPatientAllergyById(
		id: number
	): Promise<PatientAllergyRow | null> {
		const base = obsEmrBase();
		if (!base) return null;
		const r = await fetch(
			`${base}?mode=patientAllergy.byId&id=${encodeURIComponent(String(id))}`
		);
		return (await parseApi(r)) as PatientAllergyRow | null;
	}

	async function fetchActivePatientAllergies(
		pid: string
	): Promise<PatientAllergyRow[]> {
		const base = obsEmrBase();
		if (!base) return [];
		const r = await fetch(
			`${base}?mode=patientAllergy.activeByPatient&patientId=${encodeURIComponent(pid)}`
		);
		return (await parseApi(r)) as PatientAllergyRow[];
	}

	let allergies = $state<AllergyRow[]>([]);
	let severities = $state<SeverityRow[]>([]);
	let isSubmitting = $state(false);
	/** 'existing' = pick from master, 'new' = add to master then link */
	let allergyMode = $state<'existing' | 'new'>('existing');
	let selectedAllergyId = $state('');
	let newAllergyName = $state('');
	let severityId = $state('');
	let statusIdStr = $state(String(StatusEnum.ACTIVE));
	let reaction = $state('');
	let remark = $state('');
	let deactivationRemark = $state('');

	// Paginated server-side allergy search for the searchable select.
	async function searchAllergies(
		query: string
	): Promise<{ label: string; value: string }[]> {
		const base = obsEmrBase();
		if (!base) return [];
		const q = new URLSearchParams({
			mode: 'allergyMaster.paginated',
			page: '1',
			pageSize: '50'
		});
		const t = query.trim();
		if (t) q.set('search', t);
		const r = await fetch(`${base}?${q}`);
		const res = (await parseApi(r)) as {
			data: AllergyRow[];
		};
		allergies = res.data;
		return res.data.map((a) => ({
			value: String(a.id),
			label: a.name ?? '–'
		}));
	}

	async function getAllergyLabelForValue(
		value: string
	): Promise<string> {
		const id = Number(value);
		if (!id) return '';
		const local = allergies.find((a) => a.id === id);
		if (local) return local.name ?? '–';
		const base = obsEmrBase();
		if (!base) return '–';
		const r = await fetch(
			`${base}?mode=allergyMaster.byId&id=${encodeURIComponent(String(id))}`
		);
		const row = (await parseApi(r)) as AllergyRow | null;
		return row?.name ?? '–';
	}

	$effect(() => {
		const h = hospitalIdEffective;
		void (async () => {
			if (!h) return;
			try {
				const [a, s] = await Promise.all([
					fetchAllergyMasterList(),
					fetchSeverities()
				]);
				allergies = a;
				severities = s;
			} catch (e) {
				console.error(e);
			}
		})();
	});

	const allergyNameForEdit = $derived(
		isEditMode && selectedAllergyId
			? (allergies.find((a) => String(a.id) === selectedAllergyId)
					?.name ?? '–')
			: '–'
	);

	$effect(() => {
		const id = patientAllergyId;
		const h = hospitalIdEffective;
		if (id && h) {
			void (async () => {
				const row = await fetchPatientAllergyById(id);
				if (row) {
					selectedAllergyId = String(row.allergyId);
					allergyMode = 'existing';
					severityId = String(row.severityId);
					statusIdStr = String(row.statusId);
					reaction = row.reaction ?? '';
					remark = row.remark ?? '';
					deactivationRemark = row.deactivationRemark ?? '';
				}
			})();
		} else if (!id) {
			selectedAllergyId = '';
			newAllergyName = '';
			severityId = '';
			statusIdStr = String(StatusEnum.ACTIVE);
			reaction = '';
			remark = '';
			deactivationRemark = '';
			allergyMode = 'existing';
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isSubmitting) return;
		if (!patientId || !visitId || !hospitalIdEffective) {
			toastService.addToast(
				'No visit or hospital context.',
				StatusColorEnum.ERROR
			);
			return;
		}

		const severityIdNum = severityId ? Number(severityId) : 0;
		if (!severityIdNum) {
			toastService.addToast(
				'Select a severity.',
				StatusColorEnum.ERROR
			);
			return;
		}

		isSubmitting = true;
		try {
			await submitPatientAllergy(severityIdNum);
		} finally {
			isSubmitting = false;
		}
	}

	async function submitPatientAllergy(severityIdNum: number) {
		if (!obsEmrBase()) {
			toastService.addToast(
				'Hospital context missing.',
				StatusColorEnum.ERROR
			);
			return;
		}

		let allergyId: number;

		if (isEditMode && patientAllergyId) {
			const newStatusId = statusIdStr
				? Number(statusIdStr)
				: StatusEnum.ACTIVE;
			const currentAllergyId = selectedAllergyId
				? Number(selectedAllergyId)
				: 0;

			if (newStatusId === StatusEnum.INACTIVE) {
				if (!deactivationRemark.trim()) {
					toastService.addToast(
						'Deactivation remark is required when inactivating an allergy.',
						StatusColorEnum.ERROR
					);
					return;
				}
			}

			// When changing status to Active, apply No Known Allergy rules
			if (newStatusId === StatusEnum.ACTIVE && patientId) {
				const activeList =
					await fetchActivePatientAllergies(patientId);
				const othersActive = activeList.filter(
					(r) => r.id !== patientAllergyId
				);

				if (currentAllergyId === AllergyEnum.NO_KNOWN_ALLERGY) {
					// Activating "No Known Allergy" → inactivate all other active allergies
					if (othersActive.length > 0) {
						DeactivationRemarkDialogState.message = `This patient has ${othersActive.length} other active allergy record(s). Activating "No Known Allergy" will mark them as inactive. Enter deactivation remark below to continue.`;
						const result =
							await dialogService.open<DeactivationRemarkResult>({
								title: 'Inactivate other allergies',
								component: LDeactivationRemarkDialogContent
							});
						if (!result.confirmed || !result.data?.deactivationRemark)
							return;
						await emrPost({
							mode: 'patientAllergy.inactivateOthers',
							patientId,
							excludeId: patientAllergyId,
							deactivationRemark: result.data.deactivationRemark
						});
					}
				} else {
					// Activating another allergy → inactivate active "No Known Allergy" record(s)
					const noKnownActive = othersActive.filter(
						(r) => r.allergyId === AllergyEnum.NO_KNOWN_ALLERGY
					);
					if (noKnownActive.length > 0) {
						DeactivationRemarkDialogState.message = `This patient has "No Known Allergy" recorded as active. Activating this allergy will mark it as inactive. Enter deactivation remark below to continue.`;
						const result =
							await dialogService.open<DeactivationRemarkResult>({
								title: 'Inactivate No Known Allergy',
								component: LDeactivationRemarkDialogContent
							});
						if (!result.confirmed || !result.data?.deactivationRemark)
							return;
						await emrPost({
							mode: 'patientAllergy.inactivateByAllergyId',
							patientId,
							allergyId: AllergyEnum.NO_KNOWN_ALLERGY,
							deactivationRemark: result.data.deactivationRemark
						});
					}
				}
			}

			await emrPost({
				mode: 'patientAllergy.update',
				id: patientAllergyId,
				severityId: severityIdNum,
				statusId: newStatusId,
				reaction: reaction.trim() || null,
				remark: remark.trim() || null,
				deactivationRemark:
					newStatusId === StatusEnum.INACTIVE
						? deactivationRemark.trim() || null
						: null
			});
			toastSuccess(
				toastService,
				m.entity_patient_allergy(),
				m.toast_action_updated()
			);
			PatientAllergyDialogState.onSaved?.();
			await confirm({ saved: true });
			return;
		}

		if (allergyMode === 'new') {
			const name = newAllergyName.trim();
			if (!name) {
				toastService.addToast(
					'Enter allergy name when adding new.',
					StatusColorEnum.ERROR
				);
				return;
			}

			try {
				const created = (await emrPost({
					mode: 'allergyMaster.create',
					name
				})) as AllergyRow;
				// Requirement: creating a new master allergy should NOT automatically
				// add it to the patient's allergy table. Only "Select from list" + Save
				// should create a patient allergy row.
				allergies = [created, ...allergies];
				selectedAllergyId = String(created.id);
				newAllergyName = '';
				allergyMode = 'existing';
				toastInfo(
					toastService,
					m.entity_allergy_master(),
					m.toast_action_created(),
					'Select it in the list and click Save to add it to the patient.'
				);
				return;
			} catch (error: unknown) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to create allergy. Please try again.';
				toastService.addToast(message, StatusColorEnum.ERROR);
				return;
			}
		} else {
			const idNum = selectedAllergyId ? Number(selectedAllergyId) : 0;
			if (!idNum) {
				toastService.addToast(
					'Select an allergy or add a new one.',
					StatusColorEnum.ERROR
				);
				return;
			}
			allergyId = idNum;
		}

		// When adding "No Known Allergy" (id 1), check existing active allergies and show combined confirm + deactivation remark before inactivating them
		if (allergyId === AllergyEnum.NO_KNOWN_ALLERGY && patientId) {
			const existing = await fetchActivePatientAllergies(patientId);
			if (existing.length > 0) {
				DeactivationRemarkDialogState.message = `This patient has ${existing.length} existing allergy record(s). Adding "No Known Allergy" will mark them as inactive. Enter deactivation remark below to continue.`;
				const result =
					await dialogService.open<DeactivationRemarkResult>({
						title: 'Inactivate other allergies',
						component: LDeactivationRemarkDialogContent
					});
				if (!result.confirmed || !result.data?.deactivationRemark)
					return;
				await emrPost({
					mode: 'patientAllergy.inactivateAll',
					patientId,
					deactivationRemark: result.data.deactivationRemark
				});
			}
		}

		// When adding any other allergy, if patient has active "No Known Allergy", show combined confirm + deactivation remark and inactivate it
		if (allergyId !== AllergyEnum.NO_KNOWN_ALLERGY && patientId) {
			const activeList = await fetchActivePatientAllergies(patientId);
			const noKnownActive = activeList.filter(
				(r) => r.allergyId === AllergyEnum.NO_KNOWN_ALLERGY
			);
			if (noKnownActive.length > 0) {
				DeactivationRemarkDialogState.message = `This patient has "No Known Allergy" recorded as active. Adding this allergy will mark it as inactive. Enter deactivation remark below to continue.`;
				const result =
					await dialogService.open<DeactivationRemarkResult>({
						title: 'Inactivate No Known Allergy',
						component: LDeactivationRemarkDialogContent
					});
				if (!result.confirmed || !result.data?.deactivationRemark)
					return;
				await emrPost({
					mode: 'patientAllergy.inactivateByAllergyId',
					patientId,
					allergyId: AllergyEnum.NO_KNOWN_ALLERGY,
					deactivationRemark: result.data.deactivationRemark
				});
			}
		}

		try {
			await emrPost({
				mode: 'patientAllergy.create',
				visitId,
				patientId,
				allergyId,
				severityId: severityIdNum,
				reaction: reaction.trim() || null,
				remark: remark.trim() || null
			});
			toastSuccess(
				toastService,
				m.entity_patient_allergy(),
				m.toast_action_created()
			);
			PatientAllergyDialogState.onSaved?.();
			await confirm({ saved: true });
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: 'Failed to add allergy.') as string,
				StatusColorEnum.ERROR
			);
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	<div class="flex flex-col gap-4">
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="allergy-source" class="shrink-0 sm:w-36">
				Allergy
			</label>
			<div class="flex flex-1 flex-col gap-3">
				{#if isEditMode}
					<p class="text-base-content/80">
						{allergyNameForEdit ?? '–'}
					</p>
				{:else}
					<div class="flex flex-wrap gap-4">
						<label class="label cursor-pointer gap-2">
							<input
								type="radio"
								name="allergy-mode"
								class="radio radio-sm"
								checked={allergyMode === 'existing'}
								onchange={() => (allergyMode = 'existing')}
							/>
							<span>Select from list</span>
						</label>
						<label class="label cursor-pointer gap-2">
							<input
								type="radio"
								name="allergy-mode"
								class="radio radio-sm"
								checked={allergyMode === 'new'}
								onchange={() => (allergyMode = 'new')}
							/>
							<span>Add new to master</span>
						</label>
					</div>
					<div class="flex max-w-80">
						{#if allergyMode === 'existing'}
							<SearchSelect
								bind:value={selectedAllergyId}
								placeholder="Select allergy"
								className="w-full"
								searchFn={searchAllergies}
								getLabelForValue={getAllergyLabelForValue}
								minSearchLength={0}
							/>
						{:else}
							<WashInputField
								id="allergy-name"
								bind:value={newAllergyName}
								inputType="text"
								inputPlaceholderText="e.g. Penicillin"
							/>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="severity" class="shrink-0 sm:w-36">
				Severity <span class="text-error">*</span>
			</label>
			<div class="max-w-80 flex-1">
				<WashSelect
					id="severity"
					bind:value={severityId}
					optionHeader="Select severity ..."
				>
					{#each severities as s (s.id)}
						<option value={String(s.id)}>{s.name ?? '–'}</option>
					{/each}
				</WashSelect>
			</div>
		</div>

		{#if isEditMode}
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="status" class="shrink-0 sm:w-36">
					Status
				</label>
				<div class="max-w-80 flex-1">
					<WashSelect
						id="status"
						bind:value={statusIdStr}
						optionHeader="Select status ..."
					>
						<option value={String(StatusEnum.ACTIVE)}>Active</option>
						<option value={String(StatusEnum.INACTIVE)}
							>Inactive</option
						>
					</WashSelect>
				</div>
			</div>
			{#if statusIdStr === String(StatusEnum.INACTIVE)}
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
				>
					<label for="deactivation-remark" class="shrink-0 sm:w-36">
						Deactivation remark <span class="text-error">*</span>
					</label>
					<div class="min-w-0 flex-1">
						<WashTextarea
							id="deactivation-remark"
							bind:value={deactivationRemark}
							placeholder="Reason for deactivating this allergy"
							className="w-full"
						/>
					</div>
				</div>
			{/if}
		{/if}

		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
		>
			<label for="reaction" class="shrink-0 sm:w-36">
				Reaction
			</label>
			<div class="min-w-0 flex-1">
				<WashTextarea
					id="reaction"
					bind:value={reaction}
					placeholder="e.g. Rash, swelling"
					className="w-full"
				/>
			</div>
		</div>

		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
		>
			<label for="remark" class="shrink-0 sm:w-36">
				Remark
			</label>
			<div class="min-w-0 flex-1">
				<WashTextarea
					id="remark"
					bind:value={remark}
					placeholder="Optional notes"
					className="w-full"
				/>
			</div>
		</div>
	</div>

	<div class="flex flex-wrap justify-end gap-2">
		<WashButton
			type="button"
			className="btn-ghost"
			onClick={() => cancel()}
			disabled={isSubmitting}
		>
			Cancel
		</WashButton>
		<WashButton
			type="submit"
			className="btn-primary"
			loading={isSubmitting}
		>
			{isEditMode ? m.update() : m.emr_allergy_submit_add()}
		</WashButton>
	</div>
</form>
