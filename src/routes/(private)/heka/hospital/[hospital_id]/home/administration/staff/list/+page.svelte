<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiPagination from '$lib/component/daisyui/pagination/DaisyUiPagination.svelte';
	import DaisyUiPaginationItem from '$lib/component/daisyui/pagination/item/DaisyUiPaginationItem.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DeleteStaffConfirmState } from '$lib/state/delete-staff-confirm.state.svelte';
	import DeleteStaffConfirmModal from '$lib/component/own/snippet/modal/DeleteStaffConfirmModal.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type { StaffWithRelations } from '$lib/model/type/heka/staff.type';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideRefreshCcw from '$lib/component/own/library/lucide/LucideRefreshCcw.svelte';
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import { page } from '$app/state';
	import LStaffListViewEditModal from '$lib/component/own/local/private/heka/administration/staff/list/LStaffListViewEditModal.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const dateTimeUtil = new DateTimeUtil();

	const viewLock = createActionLock();
	const editLock = createActionLock();
	const deleteLock = createActionLock();
	const refreshLock = createActionLock();

	let viewingStaffId = $state<string | null>(null);
	let editingStaffId = $state<string | null>(null);
	let deletingStaffId = $state<string | null>(null);

	let staffResult =
		$state<PaginatedResult<StaffWithRelations> | null>(null);
	let currentPage = $state(1);
	let filterPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let searchInput = $state('');
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let isLoading = $state(false);

	const staffList = $derived(staffResult?.data ?? []);
	const totalPages = $derived(staffResult?.totalPages ?? 1);
	const total = $derived(staffResult?.total ?? 0);

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);

	function staffListApiBase(hospitalId: string) {
		return `/api/heka/hospital/${encodeURIComponent(
			hospitalId
		)}/home/administration/staff/list`;
	}

	async function fetchStaff(forceRefresh = false) {
		if (!hospitalId) return;
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		try {
			const sp = new URLSearchParams();
			sp.set('page', String(currentPage));
			sp.set('pageSize', String(pageSize));
			if (searchInput.trim()) sp.set('search', searchInput.trim());
			if (tableFilters.code?.trim()) sp.set('staffCode', tableFilters.code.trim());
			if (tableFilters.name?.trim()) sp.set('staffName', tableFilters.name.trim());
			if (tableFilters.phonePrimary?.trim())
				sp.set('staffPhonePrimary', tableFilters.phonePrimary.trim());
			if (forceRefresh) sp.set('_t', String(Date.now()));

			const res = await fetch(`${staffListApiBase(hospitalId)}?${sp.toString()}`);
			if (!res.ok) throw new Error(`Failed to fetch staff list (${res.status})`);
			staffResult = (await res.json()) as PaginatedResult<StaffWithRelations>;
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchStaff();
	});

	lifeCycleUtil.onDestroy(() => {
		if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout);
		if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
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

	async function handleDelete(staffId: string) {
		if (!hospitalId) return;
		await deleteLock.run(async () => {
			deletingStaffId = staffId;
			try {
				const res = await fetch(
					`${staffListApiBase(hospitalId)}?id=${encodeURIComponent(staffId)}&_t=${Date.now()}`
				);
				if (!res.ok) throw new Error(`Failed to load staff (${res.status})`);
				const staff = (await res.json()) as StaffWithRelations | null;
				if (!staff) throw new Error('Staff not found');
				const staffEmail =
					(staff as { user?: { email?: string } })?.user?.email ??
					'(no email)';
				DeleteStaffConfirmState.pending = {
					id: staffId,
					email: staffEmail
				};
				const result = await dialogService.open({
					component: DeleteStaffConfirmModal
				});
				if (result.confirmed && typeof result.data === 'string') {
					const delRes = await fetch(staffListApiBase(hospitalId), {
						method: 'DELETE',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ id: result.data })
					});
					if (!delRes.ok)
						throw new Error(`Failed to delete staff (${delRes.status})`);
					await fetchStaff(true);
					toastService.addToast(
						m.staff_deleted(),
						StatusColorEnum.SUCCESS
					);
				}
			} catch (err) {
				console.error(err);
				toastService.addToast(
					m.failed_delete_staff(),
					StatusColorEnum.ERROR
				);
			} finally {
				DeleteStaffConfirmState.pending = null;
				deletingStaffId = null;
			}
		});
	}

	type StaffDialogMode = 'view' | 'edit';
	let staffDialog = $state<{
		mode: StaffDialogMode;
		staffId: string;
	} | null>(null);

	/** Resolves when the full-screen staff dialog closes (mirrors `await dialogService.open` on branches). */
	let staffDialogCloseResolver: (() => void) | null = null;

	const registrationPath = $derived(
		page.url.pathname.replace(/\/list\/?$/, '') + '/registration'
	);
	const staffDialogIframeSrc = $derived(
		staffDialog
			? `${registrationPath}?${staffDialog.mode}=${staffDialog.staffId}&embed=1`
			: ''
	);

	async function viewData(id: string) {
		await viewLock.run(async () => {
			viewingStaffId = id;
			editingStaffId = null;
			try {
				staffDialog = { mode: 'view', staffId: id };
				await new Promise<void>((resolve) => {
					staffDialogCloseResolver = resolve;
				});
			} finally {
				viewingStaffId = null;
			}
		});
	}

	async function editData(id: string) {
		await editLock.run(async () => {
			editingStaffId = id;
			viewingStaffId = null;
			try {
				staffDialog = { mode: 'edit', staffId: id };
				await new Promise<void>((resolve) => {
					staffDialogCloseResolver = resolve;
				});
			} finally {
				editingStaffId = null;
			}
		});
	}

	function closeStaffDialog() {
		staffDialog = null;
		staffDialogCloseResolver?.();
		staffDialogCloseResolver = null;
		fetchStaff(true);
	}

	const staffColumns: MariTableColumn<StaffWithRelations>[] = [
		{
			id: 'no',
			header: 'No.',
			widthClass: 'w-16 min-w-[4rem]',
			filterable: false,
			format: (_value, _row, rowIndex) => {
				const pageSize = Number(filterPageSize) || 10;
				return (currentPage - 1) * pageSize + rowIndex + 1;
			}
		},
		{
			id: 'code',
			header: m.staff_code(),
			widthClass: 'w-32 min-w-[8rem]',
			filterable: true
		},
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-64 min-w-[16rem]',
			filterable: true,
			format: (_value, row) =>
				StringUtil.fullNameWithTitle(
					(row as StaffWithRelations).title?.name,
					(row as StaffWithRelations).firstName,
					(row as StaffWithRelations).middleName,
					(row as StaffWithRelations).lastName
				)
		},
		{
			id: 'identity',
			header: m.identity(),
			widthClass: 'w-64 min-w-[16rem]',
			filterable: false,
			format: (_value, row) => {
				const r = row as StaffWithRelations;
				return `(${r.identityType?.name ?? '—'})${r.identityNo ?? ''}`;
			}
		},
		{
			id: 'phonePrimary',
			header: m.phone_primary(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: true
		},
		{
			id: 'phoneSecondary',
			header: m.phone_secondary(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false
		},
		{
			id: 'dateOfBirth',
			header: m.date_of_birth(),
			widthClass: 'w-36 min-w-[9rem]',
			filterable: false,
			format: (value) => dateTimeUtil.formatDate(value as string)
		},
		{
			id: 'staffEmploymentType',
			header: m.employment_type(),
			widthClass: 'w-56 min-w-[14rem]',
			field: 'staffEmploymentType.name',
			filterable: false
		},
		{
			id: 'staffType',
			header: m.staff_type(),
			widthClass: 'w-40 min-w-[10rem]',
			field: 'staffType.name',
			filterable: false
		},
		{
			id: 'specialization',
			header: m.specialization(),
			widthClass: 'w-48 min-w-[12rem]',
			field: 'specialization.name',
			filterable: false
		},
		{
			id: 'maritalStatus',
			header: m.marital_status(),
			widthClass: 'w-40 min-w-[10rem]',
			field: 'maritalStatus.name',
			filterable: false
		},
		{
			id: 'nationality',
			header: m.nationality(),
			widthClass: 'w-40 min-w-[10rem]',
			field: 'nationality.name',
			filterable: false
		},
		{
			id: 'gender',
			header: m.gender(),
			widthClass: 'w-32 min-w-[8rem]',
			field: 'gender.name',
			filterable: false
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-32 min-w-[8rem]',
			defaultFilterValue: 'Active',
			field: 'status.name',
			filterable: false
		},
		{
			id: 'createdAt',
			header: m.created_at(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) => dateTimeUtil.formatDateTime(value as string)
		},
		{
			id: 'updatedAt',
			header: m.updated_at(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) => dateTimeUtil.formatDateTime(value as string)
		}
	];
</script>

<div class={TableEnum.HEIGHT}>
		<MariTable
			rows={staffList}
			columns={staffColumns}
			{isLoading}
			bind:pageSize={filterPageSize}
			bind:currentPage
			totalRowCount={total}
			showRefreshButton={true}
			refreshTooltip={m.refresh_data()}
			emptyMessage={m.no_staff_found()}
			showRowActions={true}
			actionsVariant="none"
			enableColumnFilters={true}
			useRemoteFilters={true}
			rowTooltipGetter={(row) => {
				return StringUtil.tableToolTip(row);
			}}
			on:refresh={() =>
				refreshLock.run(async () => {
					await fetchStaff(true);
				})}
			on:pageSizeChange={() => {
				currentPage = 1;
				fetchStaff();
			}}
			on:pageChange={() => fetchStaff()}
			on:filtersChange={(event) => {
				if (filterDebounceTimeout) {
					clearTimeout(filterDebounceTimeout);
				}
				tableFilters = event.detail.filters;
				currentPage = 1;
				filterDebounceTimeout = setTimeout(() => {
					fetchStaff();
				}, 350);
			}}
		>
			{#snippet rowActions(row, rowIndex)}
				{@const staffRow = row as StaffWithRelations}
				<div class="flex flex-row flex-wrap items-center justify-center gap-1">
					<DaisyUiTooltip
						tooltipText={m.view_data()}
						className="d-tooltip-ghost d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm"
							onClick={() => viewData(staffRow.id)}
							loading={viewingStaffId === staffRow.id}
							disabled={
								isLoading ||
								editingStaffId === staffRow.id ||
								deletingStaffId === staffRow.id
							}
							loadingText=""
						>
							<LucideEye className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
					<DaisyUiTooltip
						tooltipText={m.edit_data()}
						className="d-tooltip-accent d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-sm d-btn-ghost d-btn-accent"
							onClick={() => editData(staffRow.id)}
							loading={editingStaffId === staffRow.id}
							disabled={
								isLoading ||
								viewingStaffId === staffRow.id ||
								deletingStaffId === staffRow.id
							}
							loadingText=""
						>
							<LucidePencil className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
					<DaisyUiTooltip
						tooltipText={m.delete_data()}
						className="d-tooltip-error d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm d-btn-error"
							onClick={() => handleDelete(staffRow.id)}
							loading={deletingStaffId === staffRow.id}
							disabled={
								isLoading ||
								viewingStaffId === staffRow.id ||
								editingStaffId === staffRow.id
							}
							loadingText=""
						>
							<LucideTrash2 className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
				</div>
			{/snippet}
		</MariTable>
	</div>

<!-- Full-screen view/edit staff dialog -->
{#if staffDialog}
	<LStaffListViewEditModal
		{staffDialog}
		{staffDialogIframeSrc}
		{closeStaffDialog}
	/>
{/if}
