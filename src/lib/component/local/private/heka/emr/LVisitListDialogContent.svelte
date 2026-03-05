<script lang="ts">
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
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';

	const lifeCycleUtil = new LifeCycleUtil();

	let { confirm, cancel } = $props<DialogSlotProps>();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	let result =
		$state<PaginatedResult<PatientVisitWithRelations> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state('10');
let visitTypeOptions = $state<{ id: number; name: string | null }[]>([]);
	let isLoading = $state(false);
let tableFilters = $state<Record<string, string>>({});

	const visits = $derived(result?.data ?? []);
	const totalPages = $derived(result?.totalPages ?? 1);
	const total = $derived(result?.total ?? 0);

	const visitColumns: MariTableColumn<PatientVisitWithRelations>[] = [
		{
			id: 'visitNo',
			header: 'Visit No',
			widthClass: 'w-28 min-w-[6rem]',
			filterable: false,
			field: 'visitNo'
		},
		{
			id: 'patientCode',
			header: 'Patient Code',
			widthClass: 'w-32 min-w-[8rem]',
		filterable: true,
			field: 'patient.code'
		},
		{
			id: 'patientName',
			header: 'Patient Name',
			widthClass: 'w-48 min-w-[12rem]',
		filterable: true,
			format: (_value, row) =>
				row.patient
					? StringUtil.patientDisplayName(row.patient as any)
					: '—'
		},
		{
			id: 'hospitalName',
			header: 'Hospital Name',
			widthClass: 'w-40 min-w-[10rem]',
		filterable: true,
			field: 'hospital.name'
		},
		{
			id: 'branchName',
			header: 'Branch Name',
			widthClass: 'w-40 min-w-[10rem]',
		filterable: true,
			field: 'branch.name'
		},
		{
			id: 'doctorName',
			header: 'Doctor Name',
			widthClass: 'w-40 min-w-[10rem]',
		filterable: true,
			format: (_value, row) =>
				row.doctor
					? StringUtil.fullNameWithTitle(
							row.doctor.title?.name ?? null,
							row.doctor.firstName,
							row.doctor.middleName,
							row.doctor.lastName
						)
					: '—'
		},
		{
			id: 'visitType',
			header: 'Visit Type',
			widthClass: 'w-32 min-w-[8rem]',
		filterable: true,
		filterType: 'select',
		filterOptionsGetter: () =>
			visitTypeOptions.map((vt) => ({
				value: String(vt.id),
				label: vt.name ?? `Type ${vt.id}`
			})),
		field: 'visitType.name'
		},
		{
			id: 'status',
			header: 'Status',
			widthClass: 'w-28 min-w-[7rem]',
			filterable: false,
			field: 'status.name'
		}
	];

	async function fetchPatients(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(pageSizeStr) || 10;
		try {
			result = await getPatientVisitPaginatedForEmr({
				page: currentPage,
				pageSize,
				hospitalId: hospitalId ?? undefined,
			patientName: tableFilters.patientName?.trim() || undefined,
			patientCode: tableFilters.patientCode?.trim() || undefined,
			hospitalName: tableFilters.hospitalName?.trim() || undefined,
			branchName: tableFilters.branchName?.trim() || undefined,
			doctorName: tableFilters.doctorName?.trim() || undefined,
			visitTypeId: tableFilters.visitType
				? Number(tableFilters.visitType)
				: undefined,
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

let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	function handlePageSizeChange() {
		currentPage = 1;
		fetchPatients();
	}

	function handleFilterChange() {
		currentPage = 1;
		fetchPatients({ bustCache: true });
	}

	function goToPage(p: number) {
		currentPage = p;
		fetchPatients();
	}

	function selectPatient(v: PatientVisitWithRelations) {
		const patient = v.patient;
		const patientName = patient
			? StringUtil.patientDisplayName(patient as any)
			: '';
		confirm({
			visitId: v.id,
			patientName
		});
	}
</script>

<div class="flex h-full min-h-[60vh] flex-col gap-0">
	<div
		class="flex items-center justify-between border-b border-base-300 px-4 py-2"
	>
		<h2 class="text-lg font-semibold">Visit List</h2>
		<DaisyUiButton
			className="d-btn-ghost d-btn-sm d-btn-circle"
			onClick={cancel}
		>
			<LucideX className="size-5" />
		</DaisyUiButton>
	</div>

	<div
		class="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 px-4 py-2"
	>
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
					<span class="text-error"> {total}</span> visits
				</span>
			{:else}
				<span>Showing 0 of 0 visits</span>
			{/if}
		</div>
	</div>

	{#if isLoading && !result}
		<div class="flex flex-1 items-center justify-center">
			<DaisyUiLoading className="d-loading-xl" />
		</div>
	{:else}
		<div class="min-h-0 flex-1 overflow-auto px-4 py-2 {TableEnum.HEIGHT}">
			<MariTable
				rows={visits}
				columns={visitColumns}
				isLoading={isLoading}
				showRefreshButton={true}
				refreshTooltip="Refresh visits"
				emptyMessage="No visits found."
				showRowActions={true}
				actionsHeader="Actions"
				actionsVariant="select"
				enableColumnFilters={true}
				useRemoteFilters={true}
				on:refresh={() => fetchPatients({ bustCache: true })}
				on:filtersChange={(event) => {
					if (filterDebounceTimeout) {
						clearTimeout(filterDebounceTimeout);
					}
					tableFilters = event.detail.filters;
					currentPage = 1;
					filterDebounceTimeout = setTimeout(() => {
						fetchPatients({ bustCache: true });
					}, 350);
				}}
				on:select={(event) =>
					selectPatient(
						event.detail as PatientVisitWithRelations
					)}
			/>
		</div>
	{/if}

	<div
		class="flex items-center justify-between border-t border-base-200 px-4 py-2"
	>
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
			<DaisyUiButton
				className="d-btn-ghost d-btn-sm"
				onClick={cancel}
			>
				Cancel
			</DaisyUiButton>
		</div>
	</div>
</div>
