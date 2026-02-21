<script lang="ts">
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiPagination from '$lib/component/library/daisyui/pagination/DaisyUiPagination.svelte';
	import DaisyUiPaginationItem from '$lib/component/library/daisyui/pagination/item/DaisyUiPaginationItem.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import {
		getPatientPaginated,
		deletePatient,
		getPatientByIdWithRelations
	} from '$lib/remote/table/information-table/patient.remote';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DeletePatientConfirmState } from '$lib/state/delete-patient-confirm.state.svelte';
	import DeletePatientConfirmModal from '$lib/component/snippet/modal/DeletePatientConfirmModal.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { YesNoEnum } from '$lib/model/enum/db-link';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import type { PatientWithRelations } from '$lib/remote/table/information-table/patient.remote';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import { page } from '$app/state';
	import LPatientListViewEditModal from '$lib/component/local/private/heka/patient/list/LPatientListViewEditModal.svelte';
	import LucideRefreshCcw from '$lib/component/library/lucide/LucideRefreshCcw.svelte';
	import LucideChevronRight from '$lib/component/library/lucide/LucideChevronRight.svelte';
	import LucideChevronLeft from '$lib/component/library/lucide/LucideChevronLeft.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';

	const stringUtil = new StringUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let patientResult = $state<PaginatedResult<PatientWithRelations> | null>(null);
	let currentPage = $state(1);
	let filterPageSize = $state('5');
	let searchInput = $state('');
	let isLoading = $state(false);

	let patientList = $derived(patientResult?.data ?? []);
	const totalPages = $derived(patientResult?.totalPages ?? 1);
	const total = $derived(patientResult?.total ?? 0);

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? Number(page.params.hospital_id) : undefined
	);

	async function fetchPatients(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		try {
			patientResult = await getPatientPaginated({
				page: currentPage,
				pageSize,
				search: searchInput.trim() || undefined,
				hospitalId: Number.isInteger(hospitalId) ? hospitalId : undefined,
				...(opts?.bustCache && { _t: Date.now() })
			});
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
		currentPage = 1;
		fetchPatients();
	}

	function goToPage(p: number) {
		currentPage = p;
		fetchPatients();
	}

	async function handleDelete(patientId: string) {
		try {
			const patient = await getPatientByIdWithRelations({ id: patientId });
			const patientEmail =
				(patient as { user?: { email?: string } })?.user?.email ?? '(no email)';
			DeletePatientConfirmState.pending = { id: patientId, email: patientEmail };
			const result = await dialogService.open({
				component: DeletePatientConfirmModal
			});
			if (result.confirmed && typeof result.data === 'string') {
				await deletePatient({ id: result.data });
				await fetchPatients();
				toastService.addToast('Patient deleted.', StatusColorEnum.SUCCESS);
			}
		} catch (err) {
			console.error(err);
			toastService.addToast('Failed to delete patient.', StatusColorEnum.ERROR);
		} finally {
			DeletePatientConfirmState.pending = null;
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

	const PATIENT_COLUMN_COUNT = 12;

	type PatientDialogMode = 'view' | 'edit';
	let patientDialog = $state<{ mode: PatientDialogMode; patientId: string } | null>(null);

	const registrationPath = $derived(
		page.url.pathname.replace(/\/list\/?$/, '') + '/registration'
	);
	const patientDialogIframeSrc = $derived(
		patientDialog
			? `${registrationPath}?${patientDialog.mode}=${patientDialog.patientId}&embed=1`
			: ''
	);

	function viewData(id: string) {
		patientDialog = { mode: 'view', patientId: id };
	}

	function editData(id: string) {
		patientDialog = { mode: 'edit', patientId: id };
	}

	function closePatientDialog() {
		patientDialog = null;
		fetchPatients({ bustCache: true });
	}
</script>

<div
	class="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between"
>
	<p class="order-1 text-sm opacity-80 md:order-none">
		{#if total > 0}
			{@const pageSize = Number(filterPageSize) || 10}
			{@const start = (currentPage - 1) * pageSize + 1}
			{@const end = Math.min(currentPage * pageSize, total)}
			Showing <span class="text-success">{start}–{end}</span> of
			<span class="text-error">{total}</span> patients
		{:else}
			Showing 0 of 0 patients
		{/if}
	</p>

	<div class="order-3 flex flex-1 flex-wrap items-center gap-3 md:order-none md:justify-end">
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

	<div class="order-2 flex items-center gap-2 whitespace-nowrap md:order-none">
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
		<div class="order-4 w-full md:order-none md:w-auto md:justify-end">
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
	<div class="flex justify-center items-center">
		<DaisyUiLoading className="d-loading-xl" />
	</div>
{:else}
	<div class="overflow-auto max-h-[calc(100vh-18rem)]">
		<DaisyUiTable
			className="d-table d-table-zebra d-table-sm"
		>
			<DaisyUiTableHeader>
				<tr class="sticky top-0 z-3 bg-base-200">
					<th class="sticky left-0 z-1 bg-base-200 w-16 min-w-[4rem]">
						Actions
					</th>
					<th class="sticky left-[4.75rem] top-0 z-1 bg-base-200 w-32 min-w-[8rem]">
						Patient Code
					</th>
					<th class="w-64 min-w-[16rem]">Name</th>
					<th class="w-64 min-w-[16rem]">Identity</th>
					<th class="w-40 min-w-[10rem]">Phone primary</th>
					<th class="w-40 min-w-[10rem]">Phone secondary</th>
					<th class="w-36 min-w-[9rem]">Date of birth</th>
					<th class="w-48 min-w-[12rem]">Guardian</th>
					<th class="w-32 min-w-[8rem]">Status</th>
					<th class="w-40 min-w-[10rem]">Created at</th>
					<th class="w-40 min-w-[10rem]">Updated at</th>
				</tr>
			</DaisyUiTableHeader>
			<DaisyUiTableBody>
				{#each patientList as patient (patient.id)}
					<tr class="hover:bg-info/30 z-0">
						<td class="sticky left-0 z-2 bg-base-100 w-16 min-w-[4rem]">
							<div class="flex flex-col items-center gap-1">
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
						<td class="sticky left-[4.75rem] z-1 bg-base-100 w-32 min-w-[8rem]">
							{patient.code ?? '—'}
						</td>
						<td class="w-64 min-w-[16rem]">
							{StringUtil.patientDisplayName(patient)}
						</td>
						<td class="w-64 min-w-[16rem]">
							({patient.identityType?.name ?? '—'}) {patient.identityNo ?? '—'}
						</td>
						<td class="w-40 min-w-[10rem]">{patient.phonePrimary ?? '—'}</td>
						<td class="w-40 min-w-[10rem]">{patient.phoneSecondary ?? '—'}</td>
						<td class="w-36 min-w-[9rem]">{formatDate(patient.dateOfBirth)}</td>
						<td class="w-48 min-w-[12rem]">
							{patient.guardianName ?? '—'}
							{#if patient.guardianPhone}
								<span class="text-base-content/70"> · {patient.guardianPhone}</span>
							{/if}
						</td>
						<td class="w-32 min-w-[8rem]">{patient.status?.name ?? '—'}</td>
						<td class="w-40 min-w-[10rem]">
							{formatDateTime(patient.createdAt)}
						</td>
						<td class="w-40 min-w-[10rem]">
							{formatDateTime(patient.updatedAt)}
						</td>
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

<!-- Full-screen view/edit patient dialog -->
{#if patientDialog}
	<LPatientListViewEditModal
		{patientDialog}
		{patientDialogIframeSrc}
		{closePatientDialog}
	/>
{/if}
