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
	import type { StaffSchema } from '$lib/server/db/schema-type';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideRefreshCcw from '$lib/component/library/lucide/LucideRefreshCcw.svelte';
	import LucideChevronLeft from '$lib/component/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/library/lucide/LucideChevronRight.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';

	const lifeCycleUtil = new LifeCycleUtil();
	const routerUtil = new RouterUtil();
	const toastService = new ToastService();

	let staffResult = $state<PaginatedResult<StaffSchema> | null>(null);
	let currentPage = $state(1);
	let filterPageSize = $state(5);
	let searchInput = $state('');
	let isLoading = $state(false);

	const staffList = $derived(staffResult?.data ?? []);
	const totalPages = $derived(staffResult?.totalPages ?? 1);
	const total = $derived(staffResult?.total ?? 0);

	async function fetchStaff() {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		try {
			staffResult = await getStaffPaginated({
				page: currentPage,
				pageSize,
				search: searchInput.trim() || undefined
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
		filterPageSize = Number(filterPageSize) || 10;
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

	function viewData(id: string) {
		routerUtil.goToRoute(
			`${WebRoutesEnum.HEKA_HOME_ADMINISTRATION_STAFF_REGISTRATION}?view=${id}`
		);
	}

	function editData(id: string) {
		routerUtil.goToRoute(
			`${WebRoutesEnum.HEKA_HOME_ADMINISTRATION_STAFF_REGISTRATION}?edit=${id}`
		);
	}
</script>

<div class="mb-2 flex justify-between">
	<p class="text-sm whitespace-nowrap opacity-80">
		{#if total > 0}
			{@const start = (currentPage - 1) * filterPageSize + 1}
			{@const end = Math.min(currentPage * filterPageSize, total)}
			Showing <span class="text-success">{start}–{end}</span> of
			<span class="text-error">{total}</span> staff
		{:else}
			Showing 0 of 0 staff
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
				onClick={() => fetchStaff()}
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

	{#if staffResult !== null}
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

{#if isLoading && !staffResult}
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
					<th>First name</th>
					<th>Middle name</th>
					<th>Last name</th>
					<th>Phone primary</th>
					<th>Phone secondary</th>
					<th>Date of birth</th>
					<th>Address</th>
					<th>Remark</th>
					<th>Identity no</th>
					<th>Identity type id</th>
					<th>Title id</th>
					<th>Employment type id</th>
					<th>Staff type id</th>
					<th>Staff detail id</th>
					<th>City id</th>
					<th>State id</th>
					<th>Country id</th>
					<th>Marital status id</th>
					<th>Nationality id</th>
					<th>Position id</th>
					<th>Postal code id</th>
					<th>Specialization id</th>
					<th>Gender id</th>
					<th>Status id</th>
					<th>Photo URL</th>
					<th>User id</th>
					<th>Created at</th>
					<th>Updated at</th>
				</tr>
			</DaisyUiTableHeader>
			<DaisyUiTableBody>
				{#each staffList as staff (staff.id)}
					<tr class="hover:bg-info/30">
						<td>
							<div class="flex flex-col gap-1">
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
						<td class="staff-list-cell-truncate">{staff.id ?? '—'}</td
						>
						<td>{staff.firstName ?? '—'}</td>
						<td>{staff.middleName ?? '—'}</td>
						<td>{staff.lastName ?? '—'}</td>
						<td>{staff.phonePrimary ?? '—'}</td>
						<td>{staff.phoneSecondary ?? '—'}</td>
						<td>{formatDate(staff.dateOfBirth)}</td>
						<td class="staff-list-cell-wrap"
							>{staff.address ?? '—'}</td
						>
						<td class="staff-list-cell-wrap">{staff.remark ?? '—'}</td
						>
						<td>{staff.identityNo ?? '—'}</td>
						<td>{staff.identityTypeId ?? '—'}</td>
						<td>{staff.titleId ?? '—'}</td>
						<td>{staff.staffEmploymentTypeId ?? '—'}</td>
						<td>{staff.staffTypeId ?? '—'}</td>
						<td>{staff.staffDetailId ?? '—'}</td>
						<td>{staff.cityId ?? '—'}</td>
						<td>{staff.stateId ?? '—'}</td>
						<td>{staff.countryId ?? '—'}</td>
						<td>{staff.maritalStatusId ?? '—'}</td>
						<td>{staff.nationalityId ?? '—'}</td>
						<td>{staff.positionId ?? '—'}</td>
						<td>{staff.postalCodeId ?? '—'}</td>
						<td>{staff.specializationId ?? '—'}</td>
						<td>{staff.genderId ?? '—'}</td>
						<td>{staff.statusId ?? '—'}</td>
						<td class="staff-list-cell-truncate"
							>{staff.photoUrl ? 'Yes' : '—'}</td
						>
						<td class="staff-list-cell-truncate"
							>{staff.userId ?? '—'}</td
						>
						<td>{formatDateTime(staff.createdAt)}</td>
						<td>{formatDateTime(staff.updatedAt)}</td>
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
