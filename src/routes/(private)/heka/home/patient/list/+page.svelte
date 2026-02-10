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

	import LucideRefreshCcw from '$lib/component/library/lucide/LucideRefreshCcw.svelte';
	import LucideChevronLeft from '$lib/component/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/library/lucide/LucideChevronRight.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';

	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';

	import {
		getPatientPaginated,
		deletePatient,
	} from '$lib/remote/table/information-table/patient.remote';

	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import type { PatientSchema } from '$lib/server/db/schema-type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	const lifeCycleUtil = new LifeCycleUtil();
	const routerUtil = new RouterUtil();
	const toastService = new ToastService();

	let patientResult = $state<PaginatedResult<PatientSchema> | null>(null);
	let currentPage = $state(1);
	let filterPageSize = $state(5);
	let searchInput = $state('');
	let isLoading = $state(false);

	const patientList = $derived(patientResult?.data ?? []);
	const totalPages = $derived(patientResult?.totalPages ?? 1);
	const total = $derived(patientResult?.total ?? 0);

	async function fetchPatients() {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		try {
			patientResult = await getPatientPaginated({
				page: currentPage,
				pageSize,
				// simple search: by first/last name or code would require API change;
				// for now just pass through as a no-op (backend ignores)
				search: searchInput.trim() || undefined,
			} as any);
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchPatients();
	});

	let searchDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let isFirstSearchEffect = true;
	$effect(() => {
		const _query = searchInput;
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
		filterPageSize = Number(filterPageSize) || 10;
		currentPage = 1;
		fetchPatients();
	}

	function goToPage(p: number) {
		currentPage = p;
		fetchPatients();
	}

	async function handleDelete(patientId: string) {
		if (!confirm('Are you sure you want to delete this patient?')) return;
		try {
			await deletePatient({ id: patientId });
			await fetchPatients();
			toastService.addToast('Patient deleted.', StatusColorEnum.SUCCESS);
		} catch (err) {
			console.error(err);
			toastService.addToast('Failed to delete patient.', StatusColorEnum.ERROR);
		}
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) return '—';
		try {
			const d = new Date(value);
			return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
		} catch {
			return '—';
		}
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '—';
		try {
			const d = new Date(value);
			return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
		} catch {
			return '—';
		}
	}

	const PATIENT_COLUMN_COUNT = 20;

	function viewData(id: string) {
		routerUtil.goToRoute(
			`${WebRoutesEnum.HEKA_HOME_PATIENT_REGISTRATION}?view=${id}`,
		);
	}

	function editData(id: string) {
		routerUtil.goToRoute(
			`${WebRoutesEnum.HEKA_HOME_PATIENT_REGISTRATION}?edit=${id}`,
		);
	}
</script>

<div class="mb-2 flex justify-between">
	<p class="text-sm whitespace-nowrap opacity-80">
		{#if total > 0}
			{@const start = (currentPage - 1) * filterPageSize + 1}
			{@const end = Math.min(currentPage * filterPageSize, total)}
			Showing <span class="text-success">{start}–{end}</span> of
			<span class="text-error">{total}</span> patients
		{:else}
			Showing 0 of 0 patients
		{/if}
	</p>

	<div class="flex gap-5">
		<div class="staff-list-search-form">
			<DaisyUiInputField
				inputPlaceholderText="name, code, phone..."
				bind:value={searchInput}
				className="d-input-sm"
			/>
		</div>
		<DaisyUiTooltip
			tooltipText="Refresh data"
			className="d-tooltip-bottom d-tooltip-primary"
		>
			<DaisyUiButton
				className="d-btn-primary d-btn-sm"
				onClick={() => fetchPatients()}
			>
				<LucideRefreshCcw className="size-5" />
			</DaisyUiButton>
		</DaisyUiTooltip>
	</div>

	<div class="flex items-center gap-2 whitespace-nowrap">
		<span class="text-sm">per page</span>
		<DaisyUiSelect
			className="d-select d-select-sm w-16"
			bind:value={filterPageSize}
			onChange={handlePageSizeChange}
			disabled={isLoading}
		>
			<option value="5">5</option>
			<option value="10">10</option>
			<option value="25">25</option>
			<option value="50">50</option>
			<option value="100">100</option>
		</DaisyUiSelect>
	</div>

	{#if patientResult !== null}
		<div>
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
		</div>
	{/if}
</div>

{#if isLoading && !patientResult}
	<DaisyUiLoading className="d-loading-xl" />
{:else}
	<div class="h-screen overflow-x-auto">
		<DaisyUiTable
			className="d-table d-table-zebra d-table-sm d-table-pin-rows d-table-pin-cols"
		>
			<DaisyUiTableHeader>
				<tr>
					<th>Actions</th>
					<th>Id</th>
					<th>Code</th>
					<th>Registration no</th>
					<th>First name</th>
					<th>Middle name</th>
					<th>Last name</th>
					<th>Phone primary</th>
					<th>Phone secondary</th>
					<th>Date of birth</th>
					<th>Guardian name</th>
					<th>Guardian phone</th>
					<th>Address</th>
					<th>Remarks</th>
					<th>Status id</th>
					<th>User id</th>
					<th>Created at</th>
					<th>Updated at</th>
				</tr>
			</DaisyUiTableHeader>
			<DaisyUiTableBody>
				{#each patientList as patient (patient.id)}
					<tr class="hover:bg-info/30">
						<td>
							<div class="flex flex-col gap-1">
								<DaisyUiTooltip
									tooltipText="view data"
									className="d-tooltip-ghost d-tooltip-right"
								>
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										onClick={() => viewData(patient.id)}
									>
										<LucideEye className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
								<DaisyUiTooltip
									tooltipText="edit data"
									className="d-tooltip-accent d-tooltip-right"
								>
									<DaisyUiButton
										className="d-btn-sm d-btn-ghost d-btn-accent"
										onClick={() => editData(patient.id)}
									>
										<LucidePencil className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
								<DaisyUiTooltip
									tooltipText="delete data"
									className="d-tooltip-error d-tooltip-right"
								>
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm d-btn-error"
										disabled={isLoading}
										onClick={() => handleDelete(patient.id)}
									>
										<LucideTrash2 className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
							</div>
						</td>
						<td class="staff-list-cell-truncate">{patient.id ?? '—'}</td>
						<td>{patient.code ?? '—'}</td>
						<td>{patient.registrationNo ?? '—'}</td>
						<td>{patient.firstName ?? '—'}</td>
						<td>{patient.middleName ?? '—'}</td>
						<td>{patient.lastName ?? '—'}</td>
						<td>{patient.phonePrimary ?? '—'}</td>
						<td>{patient.phoneSecondary ?? '—'}</td>
						<td>{formatDate(patient.dateOfBirth)}</td>
						<td>{patient.guardian_name ?? '—'}</td>
						<td>{patient.guardian_phone ?? '—'}</td>
						<td class="staff-list-cell-wrap">
							{patient.address ?? '—'}
						</td>
						<td class="staff-list-cell-wrap">
							{patient.remarks ?? '—'}
						</td>
						<td>{patient.statusId ?? '—'}</td>
						<td class="staff-list-cell-truncate">
							{patient.userId ?? '—'}
						</td>
						<td>{formatDateTime(patient.createdAt)}</td>
						<td>{formatDateTime(patient.updatedAt)}</td>
					</tr>
				{:else}
					<tr>
						<td
							colspan={PATIENT_COLUMN_COUNT}
							class="text-center opacity-70"
						>
							No patients found.
						</td>
					</tr>
				{/each}
			</DaisyUiTableBody>
		</DaisyUiTable>
	</div>
{/if}

