<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashCardBodyAction from '$lib/component/wash/card/body/action/WashCardBodyAction.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import type { WardRow, BedRow } from '$lib/model/type/medora/ipd/ipd.type';
	import type { PatientWithRelations } from '$lib/model/type/medora/patient.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/booking`
			: ''
	);
	const branchApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/branches`
			: ''
	);
	const wardApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/ward-master?active=1`
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

	type BranchOpt = { id: string; name: string | null };
	let branches = $state<BranchOpt[]>([]);
	let wards = $state<WardRow[]>([]);
	let beds = $state<BedRow[]>([]);

	let patientMode = $state<'existing' | 'new'>('existing');
	let patientId = $state('');
	let patientName = $state('');
	let patientDateOfBirth = $state('');
	let appointmentPhone = $state('');
	let branchId = $state('');
	let preferredWardId = $state('');
	let preferredBedId = $state('');
	let expectedAdmitAt = $state('');
	let remark = $state('');
	let isSubmitting = $state(false);

	const branchOptions = $derived(
		branches.map((b) => ({
			value: b.id,
			label: b.name ?? b.id
		}))
	);
	const wardOptions = $derived(
		wards
			.filter((w) => !branchId || w.branchId === branchId)
			.map((w) => ({
				value: String(w.id),
				label: w.name
			}))
	);
	const bedOptions = $derived(
		beds.map((b) => ({
			value: String(b.id),
			label: b.name ?? String(b.id)
		}))
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
		const result =
			(await res.json()) as PaginatedResult<PatientWithRelations>;
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
		return p ? StringUtil.patientOptionDisplayName(p) : '';
	}

	async function loadBranches() {
		if (!branchApi) return;
		const res = await fetch(branchApi, { credentials: 'include' });
		if (!res.ok) return;
		const data = await res.json();
		const list = Array.isArray(data)
			? data
			: ((data?.data ?? []) as BranchOpt[]);
		branches = list.map((b: BranchOpt & { id?: string }) => ({
			id: String(b.id),
			name: b.name ?? null
		}));
	}

	async function loadWards() {
		if (!wardApi) return;
		const res = await fetch(wardApi, { credentials: 'include' });
		if (res.ok) wards = (await res.json()) as WardRow[];
	}

	async function loadBeds(wid: number) {
		if (!bedApi || !wid) {
			beds = [];
			return;
		}
		const res = await fetch(
			`${bedApi}?wardId=${encodeURIComponent(String(wid))}`,
			{ credentials: 'include' }
		);
		if (!res.ok) {
			beds = [];
			return;
		}
		const data = await res.json();
		beds = Array.isArray(data)
			? (data as BedRow[])
			: ((data?.data ?? []) as BedRow[]);
	}

	$effect(() => {
		const wid = Number(preferredWardId);
		preferredBedId = '';
		if (Number.isFinite(wid) && wid > 0) void loadBeds(wid);
		else beds = [];
	});

	async function handleCreate(e: Event) {
		e.preventDefault();
		if (isSubmitting || !api) return;
		if (!branchId) {
			toastService.addToast('Select branch', StatusColorEnum.ERROR);
			return;
		}
		if (patientMode === 'existing' && !patientId.trim()) {
			toastService.addToast('Select patient', StatusColorEnum.ERROR);
			return;
		}
		if (patientMode === 'new' && !patientName.trim()) {
			toastService.addToast(
				'Enter patient name',
				StatusColorEnum.ERROR
			);
			return;
		}
		isSubmitting = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					branchId,
					patientId:
						patientMode === 'existing' ? patientId.trim() : null,
					patientName:
						patientMode === 'new' ? patientName.trim() : null,
					patientDateOfBirth:
						patientMode === 'new'
							? patientDateOfBirth.trim() || null
							: null,
					phone: appointmentPhone.trim() || null,
					preferredWardId: preferredWardId
						? Number(preferredWardId)
						: null,
					preferredBedId: preferredBedId
						? Number(preferredBedId)
						: null,
					expectedAdmitAt: expectedAdmitAt
						? new Date(expectedAdmitAt).toISOString()
						: null,
					remark: remark.trim() || null
				})
			});
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast('Booking created', StatusColorEnum.SUCCESS);
			if (hospitalId) {
				routerUtil.replaceRoute(
					medoraHospitalPageUrl(
						hospitalId,
						WebRoutesEnum.MEDORA_HOME_ADT_BOOKING_LIST
					)
				);
			}
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : 'Create failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		loadBranches();
		loadWards();
	});
</script>

<div class="space-y-6">
	<WashCard>
		<WashCardBody>
			<form onsubmit={handleCreate} class="space-y-4">
				<WashCardBodyTitle>New Booking</WashCardBodyTitle>
				<p class="text-sm opacity-70">
					Can be created without a registered patient (like Appointment).
				</p>
				<div class="flex max-w-md gap-4">
					<label class="inline-flex items-center gap-2">
						<input
							type="radio"
							class="radio radio-primary"
							value="existing"
							bind:group={patientMode}
						/>
						<span>Existing patient</span>
					</label>
					<label class="inline-flex items-center gap-2">
						<input
							type="radio"
							class="radio radio-primary"
							value="new"
							bind:group={patientMode}
						/>
						<span>New patient</span>
					</label>
				</div>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{#if patientMode === 'existing'}
						<div>
							<label class="label-ink mb-1 block text-sm">Patient</label>
							<SearchSelect
								bind:value={patientId}
								placeholder="Search patient"
								className="w-full"
								searchFn={searchPatients}
								getLabelForValue={getPatientLabelForValue}
								minSearchLength={0}
							/>
						</div>
					{:else}
						<div>
							<label class="label-ink mb-1 block text-sm"
								>Patient name <span class="text-error">*</span></label
							>
							<WashInputField bind:value={patientName} />
						</div>
						<div>
							<label class="label-ink mb-1 block text-sm">Date of birth</label>
							<WashInputField
								bind:value={patientDateOfBirth}
								inputType="date"
							/>
						</div>
					{/if}
					<div>
						<label class="label-ink mb-1 block text-sm">Phone</label>
						<WashInputField bind:value={appointmentPhone} />
					</div>
					<div>
						<label class="label-ink mb-1 block text-sm" for="bk-branch"
							>Branch <span class="text-error">*</span></label
						>
						<WashSelect
							id="bk-branch"
							placeholder="Select branch"
							options={branchOptions}
							bind:value={branchId}
						/>
					</div>
					<div>
						<label class="label-ink mb-1 block text-sm" for="bk-ward"
							>Preferred ward</label
						>
						<WashSelect
							id="bk-ward"
							placeholder="Optional"
							options={wardOptions}
							bind:value={preferredWardId}
						/>
					</div>
					<div>
						<label class="label-ink mb-1 block text-sm" for="bk-bed"
							>Preferred bed</label
						>
						<WashSelect
							id="bk-bed"
							placeholder="Optional"
							options={bedOptions}
							bind:value={preferredBedId}
							disabled={!preferredWardId}
						/>
					</div>
					<div>
						<label class="label-ink mb-1 block text-sm"
							>Expected admit</label
						>
						<WashInputField
							bind:value={expectedAdmitAt}
							inputType="datetime-local"
						/>
					</div>
					<div class="md:col-span-2">
						<label class="label-ink mb-1 block text-sm" for="bk-remark"
							>Remark</label
						>
						<WashInputField id="bk-remark" bind:value={remark} />
					</div>
				</div>
				<WashCardBodyAction>
					<WashButton
						type="submit"
						variant="primary"
						disabled={isSubmitting}
						loading={isSubmitting}>Create booking</WashButton
					>
				</WashCardBodyAction>
			</form>
		</WashCardBody>
	</WashCard>
</div>
