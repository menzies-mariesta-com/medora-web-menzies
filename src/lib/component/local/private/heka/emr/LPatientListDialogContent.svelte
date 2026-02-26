<script lang="ts">
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiPagination from '$lib/component/library/daisyui/pagination/DaisyUiPagination.svelte';
	import DaisyUiPaginationItem from '$lib/component/library/daisyui/pagination/item/DaisyUiPaginationItem.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import LucideX from '$lib/component/library/lucide/LucideX.svelte';
	import LucideChevronLeft from '$lib/component/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/library/lucide/LucideChevronRight.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import {
		getPatientVisitPaginatedForEmr,
		type PatientVisitWithRelations
	} from '$lib/remote/table/information-table/patient-visit.remote';
	import { getVisitType } from '$lib/remote/table/information-table/visit-type.remote';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { page } from '$app/state';
	import { StringUtil } from '$lib/util/string.util.svelte';

	const lifeCycleUtil = new LifeCycleUtil();

	let { confirm, cancel } = $props<DialogSlotProps>();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id ? page.params.hospital_id : undefined
	);

	let result = $state<PaginatedResult<PatientVisitWithRelations> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state('10');
	let searchText = $state('');
	let filterPatientName = $state('');
	let filterPatientCode = $state('');
	let filterHospitalName = $state('');
	let filterBranchName = $state('');
	let filterDoctorName = $state('');
	let visitTypeOptions = $state<{ id: number; name: string | null }[]>([]);
	let selectedVisitTypeIdStr = $state('');
	let isLoading = $state(false);

	const visits = $derived(result?.data ?? []);
	const totalPages = $derived(result?.totalPages ?? 1);
	const total = $derived(result?.total ?? 0);

	async function fetchPatients(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(pageSizeStr) || 10;
		try {
			result = await getPatientVisitPaginatedForEmr({
				page: currentPage,
				pageSize,
				search: searchText.trim() || undefined,
				hospitalId: hospitalId ?? undefined,
				patientName: filterPatientName.trim() || undefined,
				patientCode: filterPatientCode.trim() || undefined,
				hospitalName: filterHospitalName.trim() || undefined,
				branchName: filterBranchName.trim() || undefined,
				doctorName: filterDoctorName.trim() || undefined,
				visitTypeId: selectedVisitTypeIdStr ? Number(selectedVisitTypeIdStr) : undefined,
				...(opts?.bustCache && { _t: Date.now() })
			});
		} finally {
			isLoading = false;
		}
	}

	async function loadVisitTypes() {
		const all = await getVisitType();
		visitTypeOptions = all
			.map((v) => ({ id: v.id, name: v.name ?? null }))
			.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
	}

	lifeCycleUtil.onMount(() => {
		fetchPatients();
		loadVisitTypes();
	});

	let searchDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let isFirstSearchEffect = true;
	$effect(() => {
		const _query = searchText;
		if (isFirstSearchEffect) {
			isFirstSearchEffect = false;
			return;
		}
		if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
		searchDebounceTimeout = setTimeout(() => {
			currentPage = 1;
			fetchPatients();
		}, 350);
		return () => {
			if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
		};
	});

	function handlePageSizeChange() {
		currentPage = 1;
		fetchPatients();
	}

	function handleFilterChange() {
		currentPage = 1;
		fetchPatients();
	}

	function goToPage(p: number) {
		currentPage = p;
		fetchPatients();
	}

	function selectPatient(v: PatientVisitWithRelations) {
		const patient = v.patient;
		const patientName = patient ? StringUtil.patientDisplayName(patient as any) : '';
		confirm({
			visitId: v.id,
			patientName
		});
	}
</script>

<div class="flex h-full min-h-[60vh] flex-col gap-0">
	<div class="flex items-center justify-between border-b border-base-300 px-4 py-2">
		<h2 class="text-lg font-semibold">Choose patient</h2>
		<DaisyUiButton
			className="d-btn-ghost d-btn-sm d-btn-circle"
			onClick={cancel}
		>
			<LucideX className="size-5" />
		</DaisyUiButton>
	</div>

	<div class="flex flex-wrap items-center gap-3 border-b border-base-200 px-4 py-2">
		<div class="flex-1 min-w-[12rem]">
			<DaisyUiInputField
				inputPlaceholderText="Search by name, code, phone..."
				bind:value={searchText}
				className="d-input-sm w-full"
			/>
		</div>
		<div class="flex items-center gap-2 whitespace-nowrap">
			<span class="text-sm">per page</span>
			<DaisyUiSelect
				className="d-select d-select-sm w-20"
				bind:value={pageSizeStr}
				onChange={handlePageSizeChange}
				disabled={isLoading}
			>
				<option value="5">5</option>
				<option value="10">10</option>
				<option value="25">25</option>
				<option value="50">50</option>
			</DaisyUiSelect>
		</div>
		<div class="flex items-center gap-2 text-sm opacity-80">
			{#if total > 0}
				{@const pageSize = Number(pageSizeStr) || 10}
				{@const start = (currentPage - 1) * pageSize + 1}
				{@const end = Math.min(currentPage * pageSize, total)}
				<span>
					Showing <span class="text-success">{start}–{end}</span> of
					<span class="text-error"> {total}</span> patients
				</span>
			{:else}
				<span>Showing 0 of 0 patients</span>
			{/if}
		</div>
	</div>

	<div class="flex flex-wrap gap-3 border-b border-base-200 px-4 py-2 text-sm">
		<div class="flex-1 min-w-[12rem]">
			<DaisyUiInputField
				inputPlaceholderText="Patient name"
				bind:value={filterPatientName}
				className="d-input-sm w-full"
				onBlur={handleFilterChange}
			/>
		</div>
		<div class="flex-1 min-w-[10rem]">
			<DaisyUiInputField
				inputPlaceholderText="Patient code"
				bind:value={filterPatientCode}
				className="d-input-sm w-full"
				onBlur={handleFilterChange}
			/>
		</div>
		<div class="flex-1 min-w-[12rem]">
			<DaisyUiInputField
				inputPlaceholderText="Hospital name"
				bind:value={filterHospitalName}
				className="d-input-sm w-full"
				onBlur={handleFilterChange}
			/>
		</div>
		<div class="flex-1 min-w-[12rem]">
			<DaisyUiInputField
				inputPlaceholderText="Branch name"
				bind:value={filterBranchName}
				className="d-input-sm w-full"
				onBlur={handleFilterChange}
			/>
		</div>
		<div class="flex-1 min-w-[12rem]">
			<DaisyUiInputField
				inputPlaceholderText="Doctor name"
				bind:value={filterDoctorName}
				className="d-input-sm w-full"
				onBlur={handleFilterChange}
			/>
		</div>
		<div class="flex-1 min-w-[12rem]">
			<DaisyUiSelect
				className="d-select d-select-sm w-full"
				bind:value={selectedVisitTypeIdStr}
				onChange={handleFilterChange}
			>
				<option value="">All visit types</option>
				{#each visitTypeOptions as vt (vt.id)}
					<option value={String(vt.id)}>{vt.name ?? `Type ${vt.id}`}</option>
				{/each}
			</DaisyUiSelect>
		</div>
	</div>

	{#if isLoading && !result}
		<div class="flex flex-1 items-center justify-center">
			<DaisyUiLoading className="d-loading-xl" />
		</div>
	{:else}
		<div class="flex-1 min-h-0 overflow-auto px-4 py-2">
			<DaisyUiTable className="d-table d-table-sm">
				<DaisyUiTableHeader>
					<tr class="sticky top-0 z-10 bg-base-200">
						<th class="w-24 min-w-[6rem]">Actions</th>
						<th class="w-28 min-w-[6rem]">Visit No</th>
						<th class="w-32 min-w-[8rem]">Patient Code</th>
						<th class="w-48 min-w-[12rem]">Patient Name</th>
						<th class="w-40 min-w-[10rem]">Hospital</th>
						<th class="w-40 min-w-[10rem]">Branch</th>
						<th class="w-40 min-w-[10rem]">Doctor</th>
						<th class="w-32 min-w-[8rem]">Visit Type</th>
						<th class="w-28 min-w-[7rem]">Status</th>
					</tr>
				</DaisyUiTableHeader>
				<DaisyUiTableBody>
					{#each visits as v (v.id)}
						<tr class="hover:bg-info/20">
							<td class="w-24 min-w-[6rem]">
								<DaisyUiTooltip
									tooltipText="Select this patient"
									className="d-tooltip-left d-tooltip-primary"
								>
									<DaisyUiButton
										className="d-btn-primary d-btn-sm w-full"
										onClick={() => selectPatient(v)}
									>
										Select
									</DaisyUiButton>
								</DaisyUiTooltip>
							</td>
							<td class="w-32 min-w-[8rem]">
								{v.visitNo ?? v.id}
							</td>
							<td class="w-32 min-w-[8rem]">
								{v.patient?.code ?? '—'}
							</td>
							<td class="w-48 min-w-[12rem]">
								{v.patient ? StringUtil.patientDisplayName(v.patient as any) : '—'}
							</td>
							<td class="w-40 min-w-[10rem]">
								{v.hospital?.name ?? '—'}
							</td>
							<td class="w-40 min-w-[10rem]">
								{v.branch?.name ?? '—'}
							</td>
							<td class="w-40 min-w-[10rem]">
								{v.doctor
									? StringUtil.fullNameWithTitle(
											v.doctor.title?.name ?? null,
											v.doctor.firstName,
											v.doctor.middleName,
											v.doctor.lastName
										)
									: '—'}
							</td>
							<td class="w-32 min-w-[8rem]">
								{v.visitType?.name ?? '—'}
							</td>
							<td class="w-28 min-w-[7rem]">
								{v.status?.name ?? '—'}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan={5} class="py-6 text-center opacity-70">
								No patients found.
							</td>
						</tr>
					{/each}
				</DaisyUiTableBody>
			</DaisyUiTable>
		</div>
	{/if}

	<div class="flex items-center justify-between border-t border-base-200 px-4 py-2">
		<div>
			{#if totalPages > 1}
				<DaisyUiPagination>
					<DaisyUiPaginationItem
						onClick={() => goToPage(currentPage - 1)}
						className="d-btn-sm"
						disabled={currentPage <= 1 || isLoading}
					>
						<LucideChevronLeft className="size-5" />
					</DaisyUiPaginationItem>
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p (p)}
						<DaisyUiPaginationItem
							className="d-btn-sm"
							onClick={() => goToPage(p)}
						>
							{p}
						</DaisyUiPaginationItem>
					{/each}
					<DaisyUiPaginationItem
						onClick={() => goToPage(currentPage + 1)}
						className="d-btn-sm"
						disabled={currentPage >= totalPages || isLoading}
					>
						<LucideChevronRight className="size-5" />
					</DaisyUiPaginationItem>
				</DaisyUiPagination>
			{/if}
		</div>
		<div class="flex gap-2">
			<DaisyUiButton className="d-btn-ghost d-btn-sm" onClick={cancel}>
				Cancel
			</DaisyUiButton>
		</div>
	</div>
</div>

