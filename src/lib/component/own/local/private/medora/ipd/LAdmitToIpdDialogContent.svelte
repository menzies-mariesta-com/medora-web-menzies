<script lang="ts">
	/**
	 * ATD Admission: pick patient + ward/bed → creates a new IPD visit + admission.
	 * Does not convert an existing OPD visit.
	 */
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type { WardRow, BedRow } from '$lib/model/type/medora/ipd/ipd.type';
	import type { PatientWithRelations } from '$lib/model/type/medora/patient.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { AdmitToIpdDialogState } from '$lib/state/admit-to-ipd-dialog.state.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	let { confirm, cancel }: DialogSlotProps = $props();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const censusApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/nursing-workbench/ipd/census`
			: ''
	);
	const wardApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/ward-master`
			: ''
	);
	const bedApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/bed-master`
			: ''
	);
	const patientApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/registration/patient/list`
			: ''
	);

	let wards = $state<WardRow[]>([]);
	let beds = $state<BedRow[]>([]);
	let selectedPatientId = $state(
		AdmitToIpdDialogState.patientId?.trim() || ''
	);
	let wardId = $state('');
	let bedId = $state('');
	let reasonNotes = $state('');
	let isSubmitting = $state(false);
	let isLoading = $state(false);

	const selectedWard = $derived(
		wards.find((w) => String(w.id) === wardId) ?? null
	);
	const branchId = $derived(
		AdmitToIpdDialogState.branchId ??
			selectedWard?.branchId ??
			null
	);

	const wardOptions = $derived(
		wards.map((w) => ({
			value: String(w.id),
			label: w.code ? `${w.name} (${w.code})` : w.name
		}))
	);
	const bedOptions = $derived(
		beds.map((b) => {
			const base = b.code ? `${b.name} (${b.code})` : b.name;
			const room = b.roomName ? ` · ${b.roomName}` : '';
			const tariff =
				b.dailyTariff != null ? ` · ${b.dailyTariff}/day` : '';
			return { value: String(b.id), label: `${base}${room}${tariff}` };
		})
	);

	async function searchPatients(
		query: string
	): Promise<{ label: string; value: string }[]> {
		if (!patientApi) return [];
		const qs = new URLSearchParams({
			page: '1',
			pageSize: String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT)
		});
		if (query.trim()) qs.set('search', query.trim());
		const res = await fetch(`${patientApi}?${qs}`, {
			credentials: 'include'
		});
		if (!res.ok) return [];
		const result = (await res.json()) as PaginatedResult<PatientWithRelations>;
		return (result.data ?? []).map((p) => ({
			label: StringUtil.patientOptionDisplayName(p),
			value: String(p.id)
		}));
	}

	async function getPatientLabelForValue(id: string): Promise<string> {
		if (!patientApi || !id) return '';
		const res = await fetch(
			`${patientApi}?id=${encodeURIComponent(id)}`,
			{ credentials: 'include' }
		);
		if (!res.ok) return '';
		const p = (await res.json()) as PatientWithRelations | null;
		if (!p || typeof p !== 'object') return '';
		return StringUtil.patientOptionDisplayName(p);
	}

	async function loadWards() {
		if (!wardApi) return;
		isLoading = true;
		try {
			const qs = new URLSearchParams({ active: '1' });
			if (AdmitToIpdDialogState.branchId)
				qs.set('branchId', AdmitToIpdDialogState.branchId);
			const res = await fetch(`${wardApi}?${qs}`, {
				credentials: 'include'
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			wards = (await res.json()) as WardRow[];
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Failed to load wards',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	async function loadFreeBeds(wid: number) {
		if (!bedApi || !wid) {
			beds = [];
			return;
		}
		const res = await fetch(
			`${bedApi}?free=1&wardId=${encodeURIComponent(String(wid))}`,
			{ credentials: 'include' }
		);
		if (!res.ok) {
			beds = [];
			return;
		}
		beds = (await res.json()) as BedRow[];
	}

	$effect(() => {
		void loadWards();
	});

	$effect(() => {
		const wid = Number(wardId);
		bedId = '';
		if (Number.isFinite(wid) && wid > 0) void loadFreeBeds(wid);
		else beds = [];
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting) return;
		const patientId = selectedPatientId.trim();
		if (!patientId) {
			toastService.addToast('Select a patient', StatusColorEnum.ERROR);
			return;
		}
		if (!branchId) {
			toastService.addToast(
				'Branch could not be resolved from ward',
				StatusColorEnum.ERROR
			);
			return;
		}
		const wid = Number(wardId);
		const bid = Number(bedId);
		if (!wid || !bid) {
			toastService.addToast(
				'Select ward and bed',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!censusApi) return;
		isSubmitting = true;
		try {
			const res = await fetch(censusApi, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'admit',
					patientId,
					wardId: wid,
					bedId: bid,
					branchId,
					reasonNotes: reasonNotes.trim() || null,
					admittingDoctorId: AdmitToIpdDialogState.admittingDoctorId
				})
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Admit failed: ${res.status}`);
			}
			toastService.addToast(
				'Patient admitted to IPD (new visit created)',
				StatusColorEnum.SUCCESS
			);
			confirm(await res.json());
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : 'Admit failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex min-h-0 flex-1 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
		<div class="flex flex-col gap-4">
			{#if isLoading}
				<p class="text-sm opacity-70">Loading wards…</p>
			{/if}
			<label class="label-ink text-sm font-medium" for="admit-patient"
				>Patient</label
			>
			<SearchSelect
				bind:value={selectedPatientId}
				placeholder="Search patient"
				className="w-full"
				searchFn={searchPatients}
				getLabelForValue={getPatientLabelForValue}
				minSearchLength={0}
			/>
			<label class="label-ink text-sm font-medium" for="admit-ward"
				>Ward</label
			>
			<WashSelect
				id="admit-ward"
				placeholder="Select ward"
				options={wardOptions}
				bind:value={wardId}
			/>
			<label class="label-ink text-sm font-medium" for="admit-bed"
				>Bed</label
			>
			<WashSelect
				id="admit-bed"
				placeholder={wardId ? 'Select free bed' : 'Select ward first'}
				options={bedOptions}
				bind:value={bedId}
				disabled={!wardId}
			/>
			<label class="label-ink text-sm font-medium" for="admit-notes"
				>Notes</label
			>
			<WashInputField
				id="admit-notes"
				bind:value={reasonNotes}
				inputPlaceholderText="Optional reason / notes"
			/>
		</div>
	</div>
	<WashDialogFooter>
		<WashButton
			type="button"
			variant="ghost"
			disabled={isSubmitting}
			onClick={() => cancel()}
		>
			Cancel
		</WashButton>
		<WashButton
			type="submit"
			variant="primary"
			disabled={isSubmitting}
			loading={isSubmitting}
		>
			Admit
		</WashButton>
	</WashDialogFooter>
</form>
