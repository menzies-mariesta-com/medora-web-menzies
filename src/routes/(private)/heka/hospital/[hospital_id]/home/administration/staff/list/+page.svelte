<script lang="ts">
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
	import { m } from '$lib/paraglide/messages';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let staffResult =
		$state<PaginatedResult<StaffWithRelations> | null>(null);
	let currentPage = $state(1);
	let filterPageSize = $state('5');
	let searchInput = $state('');
	let tableFilters = $state<Record<string, string>>({});
let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
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

	async function fetchStaff(forceRefresh = false) {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		const params = {
			page: currentPage,
			pageSize,
			search: searchInput.trim() || undefined,
			hospitalId: hospitalId ?? undefined,
			staffCode: tableFilters.code?.trim() || undefined,
			staffName: tableFilters.name?.trim() || undefined,
			staffPhonePrimary:
				tableFilters.phonePrimary?.trim() || undefined
		};
		try {
			// After create/update/delete or dialog close, invalidate cache then fetch so list updates
			if (forceRefresh) {
				await getStaffPaginated(params).refresh();
			}
			staffResult = await getStaffPaginated(params);
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
				await deleteStaff({ id: result.data });
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

	type StaffDialogMode = 'view' | 'edit';
	let staffDialog = $state<{
		mode: StaffDialogMode;
		staffId: string;
	} | null>(null);

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
		fetchStaff(true);
	}

const staffColumns: MariTableColumn<StaffWithRelations>[] = [
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
		format: (value) => formatDate(value)
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
		field: 'status.name',
		filterable: false
	},
	{
		id: 'createdAt',
		header: m.created_at(),
		widthClass: 'w-40 min-w-[10rem]',
		filterable: false,
		format: (value) => formatDateTime(value)
	},
	{
		id: 'updatedAt',
		header: m.updated_at(),
		widthClass: 'w-40 min-w-[10rem]',
		filterable: false,
		format: (value) => formatDateTime(value)
	}
];
</script>

{#if isLoading && !staffResult}
	<div class="flex items-center justify-center">
		<DaisyUiLoading className="d-loading-xl" />
	</div>
{:else}
	<div class="max-h-[calc(100vh-18rem)]">
		<MariTable
			rows={staffList}
			columns={staffColumns}
			isLoading={isLoading}
			showRefreshButton={true}
			refreshTooltip={m.refresh_data()}
			emptyMessage={m.no_staff_found()}
			showRowActions={true}
			actionsVariant="none"
			enableColumnFilters={true}
			useRemoteFilters={true}
			on:refresh={() => fetchStaff(true)}
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
			<svelte:fragment slot="rowActions" let:row>
				<div class="flex flex-col items-center gap-1">
					<DaisyUiTooltip
						tooltipText={m.view_data()}
						className="d-tooltip-ghost d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm"
							onClick={() => viewData(row.id)}
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
							onClick={() => editData(row.id)}
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
							disabled={isLoading}
							onClick={() => handleDelete(row.id)}
						>
							<LucideTrash2 className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
				</div>
			</svelte:fragment>
		</MariTable>
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
