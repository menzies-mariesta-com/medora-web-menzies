<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import type { StatusListRow } from '$lib/model/type/medora/ui-rows.type';
	import type { StaffRegDepartmentRow } from '$lib/model/type/medora/staff-reg-ui.type';
	import { DepartmentModalState } from '$lib/state/department-modal.state.svelte';
	import DepartmentFormModal from '$lib/component/own/local/private/medora/administration/department/DepartmentFormModal.svelte';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import MariTableEditDeleteActions from '$lib/component/own/library/mari/table/MariTableEditDeleteActions.svelte';
	import { m } from '$lib/paraglide/messages';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	const deptApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/departments`
			: ''
	);

	let rows = $state<StaffRegDepartmentRow[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let statusOptions = $state<StatusListRow[]>([]);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const departmentColumns: MariTableColumn<StaffRegDepartmentRow>[] =
		[
			{
				id: 'id',
				header: m.id(),
				widthClass: 'w-16 min-w-[4rem]',
				filterable: false
			},
			{
				id: 'name',
				header: m.name(),
				widthClass: 'w-56 min-w-[12rem]',
				filterable: true,
				field: 'name'
			},
			{
				id: 'code',
				header: m.code(),
				widthClass: 'w-36 min-w-[8rem]',
				filterable: true,
				field: 'code'
			},
			{
				id: 'status',
				header: m.status(),
				widthClass: 'w-40 min-w-[10rem]',
				filterable: true,
				filterType: 'select',
				filterOptions: [
					{ label: 'Active', value: String(StatusEnum.ACTIVE) },
					{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
				],
				defaultFilterValue: String(StatusEnum.ACTIVE),
				format: (_value, row) =>
					row.statusId === StatusEnum.ACTIVE
						? 'Active'
						: row.statusId === StatusEnum.INACTIVE
							? 'Inactive'
							: (statusOptions.find((s) => s.id === row.statusId)
									?.name ?? String(row.statusId))
			}
		];

	async function fetchRows(_forceRefresh = false) {
		if (!deptApi) return;
		isLoading = true;
		const pageSize = Number(pageSizeStr) || 10;
		try {
			const parsedStatusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const qs = new URLSearchParams();
			qs.set('page', String(currentPage));
			qs.set('pageSize', String(pageSize));
			const name = tableFilters.name?.trim();
			const code = tableFilters.code?.trim();
			if (name) qs.set('name', name);
			if (code) qs.set('code', code);
			if (parsedStatusId != null && Number.isFinite(parsedStatusId)) {
				qs.set('statusId', String(parsedStatusId));
			}
			const res = await fetch(`${deptApi}?${qs.toString()}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Load failed: ${res.status}`);
			}
			const result = (await res.json()) as {
				data: StaffRegDepartmentRow[];
				total: number;
				totalPages: number;
			};
			rows = result.data;
			total = result.total;
			totalPages = result.totalPages;
		} finally {
			isLoading = false;
		}
	}

	function goToPage(p: number) {
		currentPage = Math.max(1, Math.min(p, totalPages));
		fetchRows();
	}

	async function loadStatusOptions() {
		const res = await fetch('/api/medora/master/status', {
			credentials: 'include',
			cache: 'no-store'
		});
		if (!res.ok) return;
		statusOptions = await res.json();
	}

	lifeCycleUtil.onMount(() => {
		loadStatusOptions();
		fetchRows();
	});

	async function openCreate() {
		DepartmentModalState.mode = 'create';
		DepartmentModalState.editDepartment = null;
		const result = await dialogService.open({
			title: m.new_department(),
			component: DepartmentFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function openEdit(row: StaffRegDepartmentRow) {
		DepartmentModalState.mode = 'edit';
		DepartmentModalState.editDepartment = row;
		const result = await dialogService.open({
			title: m.edit_department(),
			component: DepartmentFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function handleDelete(row: StaffRegDepartmentRow) {
		const result = await dialogService.open({
			title: m.delete_department(),
			message: `Delete="${row.name ?? row.code ?? m.departments()}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		if (!deptApi) return;
		try {
			const res = await fetch(
				`${deptApi}?id=${encodeURIComponent(String(row.id))}`,
				{ method: 'DELETE', credentials: 'include' }
			);
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Delete failed: ${res.status}`);
			}
			toastService.addToast(
				m.department_deleted(),
				StatusColorEnum.SUCCESS
			);
			fetchRows();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">{m.departments()}</h1>
		<WashButton className="btn-primary" onClick={openCreate}>
			<LucidePlus />
			{m.new_department()}
		</WashButton>
	</div>

	<WashCard>
		<WashCardBody>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					{rows}
					columns={departmentColumns}
					{isLoading}
					bind:pageSize={pageSizeStr}
					bind:currentPage
					totalRowCount={total}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					emptyMessage={m.no_departments_create()}
					showRowActions={true}
					actionsHeader={m.actions()}
					actionsVariant="none"
					enableColumnFilters={true}
					useRemoteFilters={true}
					on:refresh={() => fetchRows()}
					on:pageSizeChange={() => {
						currentPage = 1;
						fetchRows();
					}}
					on:pageChange={() => fetchRows()}
					on:filtersChange={(event) => {
						if (filterDebounceTimeout) {
							clearTimeout(filterDebounceTimeout);
						}
						tableFilters = event.detail.filters;
						currentPage = 1;
						filterDebounceTimeout = setTimeout(() => {
							fetchRows();
						}, 350);
					}}
				>
					{#snippet rowActions(row, _rowIndex)}
						<MariTableEditDeleteActions
							onEdit={() => openEdit(row)}
							onDelete={() => handleDelete(row)}
						/>
					{/snippet}
				</MariTable>
			</div>
			{#if totalPages > 1}
				<div class="mt-4 flex justify-center gap-2">
					<WashButton
						className="btn-sm"
						disabled={currentPage <= 1}
						onClick={() => goToPage(currentPage - 1)}
					>
						{m.previous()}
					</WashButton>
					<span class="flex items-center px-2">
						{m.page()}
						{currentPage}
						{m.of()}
						{totalPages}
					</span>
					<WashButton
						className="btn-sm"
						disabled={currentPage >= totalPages}
						onClick={() => goToPage(currentPage + 1)}
					>
						{m.next()}
					</WashButton>
				</div>
			{/if}
		</WashCardBody>
	</WashCard>
</div>
