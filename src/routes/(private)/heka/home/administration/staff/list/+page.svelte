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
		getStaffPaginated,
		deleteStaff,
		getStaffByIdWithRelations
	} from '$lib/remote/table/information-table/staff.remote';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DeleteStaffConfirmState } from '$lib/state/delete-staff-confirm.state.svelte';
	import DeleteStaffConfirmModal from '$lib/component/snippet/modal/DeleteStaffConfirmModal.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import type { StaffWithRelations } from '$lib/remote/table/information-table/staff.remote';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideRefreshCcw from '$lib/component/library/lucide/LucideRefreshCcw.svelte';
	import LucideChevronLeft from '$lib/component/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/library/lucide/LucideChevronRight.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import { page } from '$app/state';
	import LStaffListViewEditModal from '$lib/component/local/private/heka/administration/staff/list/LStaffListViewEditModal.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let staffResult = $state<PaginatedResult<StaffWithRelations> | null>(null);
	let currentPage = $state(1);
	let filterPageSize = $state('5');
	let searchInput = $state('');
	let isLoading = $state(false);

	const staffList = $derived(staffResult?.data ?? []);
	const totalPages = $derived(staffResult?.totalPages ?? 1);
	const total = $derived(staffResult?.total ?? 0);

	async function fetchStaff(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		try {
			staffResult = await getStaffPaginated({
				page: currentPage,
				pageSize,
				search: searchInput.trim() || undefined,
				...(opts?.bustCache && { _t: Date.now() })
			});
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchStaff();
	});

	let searchDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
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
			fetchStaff();
		}, 350);
		return () => {
			if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
		};
	});

	function handlePageSizeChange() {
		currentPage = 1;
		fetchStaff();
	}

	function goToPage(p: number) {
		currentPage = p;
		fetchStaff();
	}

	async function handleDelete(staffId: string) {
		try {
			const staff = await getStaffByIdWithRelations({ id: staffId });
			const staffEmail =
				(staff as { user?: { email?: string } })?.user?.email ?? '(no email)';
			DeleteStaffConfirmState.pending = { id: staffId, email: staffEmail };
			const result = await dialogService.open({
				title: 'Delete staff',
				component: DeleteStaffConfirmModal
			});
			if (result.confirmed && typeof result.data === 'string') {
				await deleteStaff({ id: result.data });
				await fetchStaff();
				toastService.addToast('Staff deleted.', StatusColorEnum.SUCCESS);
			}
		} catch (err) {
			console.error(err);
			toastService.addToast('Failed to delete staff.', StatusColorEnum.ERROR);
		} finally {
			DeleteStaffConfirmState.pending = null;
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

	const STAFF_COLUMN_COUNT = 30;

	type StaffDialogMode = 'view' | 'edit';
	let staffDialog = $state<{ mode: StaffDialogMode; staffId: string } | null>(null);

	const registrationPath = $derived(
		page.url.pathname.replace(/\/list\/?$/, '') + '/registration'
	);
	const staffDialogIframeSrc = $derived(
		staffDialog
			? `${registrationPath}?${staffDialog.mode}=${staffDialog.staffId}&embed=1`
			: ''
	);

	function viewData(id: string) {
		staffDialog = { mode: 'view', staffId: id };
	}

	function editData(id: string) {
		staffDialog = { mode: 'edit', staffId: id };
	}

	function closeStaffDialog() {
		staffDialog = null;
		fetchStaff({ bustCache: true });
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
			<span class="text-error">{total}</span> staff
		{:else}
			Showing 0 of 0 staff
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
				onClick={() => fetchStaff()}
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

	{#if staffResult !== null}
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

{#if isLoading && !staffResult}
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
						Staff Code
					</th>
					<th class="w-64 min-w-[16rem]">Name</th>
					<th class="w-64 min-w-[16rem]">Identity</th>
					<th class="w-40 min-w-[10rem]">Phone primary</th>
					<th class="w-40 min-w-[10rem]">Phone secondary</th>
					<th class="w-36 min-w-[9rem]">Date of birth</th>
					<th class="w-56 min-w-[14rem]">Employment Type</th>
					<th class="w-40 min-w-[10rem]">Staff Type</th>
					<th class="w-48 min-w-[12rem]">Specialization</th>
					<th class="w-40 min-w-[10rem]">Marital status</th>
					<th class="w-40 min-w-[10rem]">Nationality</th>
					<th class="w-32 min-w-[8rem]">Gender</th>
					<th class="w-32 min-w-[8rem]">Status</th>
					<th class="w-40 min-w-[10rem]">Created at</th>
					<th class="w-40 min-w-[10rem]">Updated at</th>
				</tr>
			</DaisyUiTableHeader>
			<DaisyUiTableBody>
				{#each staffList as staff (staff.id)}
					<tr class="hover:bg-info/30 z-0">
						<td class="sticky left-0 z-2 bg-base-100 w-16 min-w-[4rem]">
							<div class="flex flex-col items-center gap-1">
								<DaisyUiTooltip
									tooltipText="view data"
									className="d-tooltip-ghost d-tooltip-right"
								>
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										onClick={() => viewData(staff.id)}
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
										onClick={() => editData(staff.id)}
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
										onClick={() => handleDelete(staff.id)}
									>
										<LucideTrash2 className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
							</div>
						</td>
						<td class="sticky left-[4.75rem] z-1 bg-base-100 w-32 min-w-[8rem]">
							{staff.code ?? '—'}
						</td>
						<td class="w-64 min-w-[16rem]">
							{StringUtil.fullNameWithTitle(
								staff.title?.name,
								staff.firstName,
								staff.middleName,
								staff.lastName
							)}
						</td>
						<td class="w-64 min-w-[16rem]">
							({staff.identityType?.name ?? '—'}){staff.identityNo}
						</td>
						<td class="w-40 min-w-[10rem]">{staff.phonePrimary ?? '—'}</td>
						<td class="w-40 min-w-[10rem]">{staff.phoneSecondary ?? '—'}</td>
						<td class="w-36 min-w-[9rem]">{formatDate(staff.dateOfBirth)}</td>
						<td class="w-56 min-w-[14rem]">
							{staff.staffEmploymentType?.name ?? '—'}
						</td>
						<td class="w-40 min-w-[10rem]">{staff.staffType?.name ?? '—'}</td>
						<td class="w-48 min-w-[12rem]">
							{staff.specialization?.name ?? '—'}
						</td>
						<td class="w-40 min-w-[10rem]">
							{staff.maritalStatus?.name ?? '—'}
						</td>
						<td class="w-40 min-w-[10rem]">
							{staff.nationality?.name ?? '—'}
						</td>
						<td class="w-32 min-w-[8rem]">{staff.gender?.name ?? '—'}</td>
						<td class="w-32 min-w-[8rem]">{staff.status?.name ?? '—'}</td>
						<td class="w-40 min-w-[10rem]">
							{formatDateTime(staff.createdAt)}
						</td>
						<td class="w-40 min-w-[10rem]">
							{formatDateTime(staff.updatedAt)}
						</td>
					</tr>
				{:else}
					<tr>
						<td
							colspan={STAFF_COLUMN_COUNT}
							class="text-center opacity-70">No staff found.</td
						>
					</tr>
				{/each}
			</DaisyUiTableBody>
		</DaisyUiTable>
	</div>
{/if}

<!-- Full-screen view/edit staff dialog -->
{#if staffDialog}
	<LStaffListViewEditModal
		{staffDialog}
		{staffDialogIframeSrc}
		{closeStaffDialog}
	/>
{/if}
