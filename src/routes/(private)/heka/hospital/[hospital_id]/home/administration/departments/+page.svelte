<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import {
		getDepartmentPaginated,
		deleteDepartment
	} from '$lib/tool/remote/table/master-table/department.http.tool.svelte';
	import type { DepartmentSchema } from '$lib/server/db/schema-type';
	import { DepartmentModalState } from '$lib/state/department-modal.state.svelte';
	import DepartmentFormModal from '$lib/component/own/local/private/heka/administration/department/DepartmentFormModal.svelte';
	import type { StatusSchema } from '$lib/server/db/schema-type';
	import { getStatus } from '$lib/tool/remote/table/master-table/status.http.tool.svelte';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import { m } from '$lib/paraglide/messages';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let rows = $state<DepartmentSchema[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let statusOptions = $state<StatusSchema[]>([]);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const departmentColumns: MariTableColumn<DepartmentSchema>[] = [
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

	async function fetchRows(forceRefresh = false) {
		isLoading = true;
		const pageSize = Number(pageSizeStr) || 10;
		try {
			const parsedStatusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const params = {
				page: currentPage,
				pageSize,
				name: tableFilters.name?.trim() || undefined,
				code: tableFilters.code?.trim() || undefined,
				statusId:
					parsedStatusId != null && Number.isFinite(parsedStatusId)
						? parsedStatusId
						: undefined
			};
			if (forceRefresh) {
				await getDepartmentPaginated(params).refresh();
			}
			const result = await getDepartmentPaginated(params);
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
		statusOptions = await getStatus();
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
		if (result.confirmed) fetchRows(true);
	}

	async function openEdit(row: DepartmentSchema) {
		DepartmentModalState.mode = 'edit';
		DepartmentModalState.editDepartment = row;
		const result = await dialogService.open({
			title: m.edit_department(),
			component: DepartmentFormModal
		});
		if (result.confirmed) fetchRows(true);
	}

	async function handleDelete(row: DepartmentSchema) {
		const result = await dialogService.open({
			title: m.delete_department(),
			message: `Delete "${row.name ?? row.code ?? m.departments()}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteDepartment({ id: row.id });
			toastService.addToast(
				m.department_deleted(),
				StatusColorEnum.SUCCESS
			);
			fetchRows(true);
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
		<DaisyUiButton className="d-btn-primary" onClick={openCreate}>
			<LucidePlus />
			{m.new_department()}
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					rows={rows}
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
					on:refresh={() => fetchRows(true)}
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
						<td class="text-right">
							<div class="flex justify-end gap-2">
								<DaisyUiButton
									className="d-btn-ghost d-btn-sm"
									onClick={() => openEdit(row)}
								>
									<LucidePencil />
								</DaisyUiButton>
								<DaisyUiButton
									className="d-btn-ghost d-btn-error d-btn-sm"
									onClick={() => handleDelete(row)}
								>
									<LucideTrash2 />
								</DaisyUiButton>
							</div>
						</td>
					{/snippet}
				</MariTable>
			</div>
			{#if totalPages > 1}
				<div class="mt-4 flex justify-center gap-2">
					<DaisyUiButton
						className="d-btn-sm"
						disabled={currentPage <= 1}
						onClick={() => goToPage(currentPage - 1)}
					>
						{m.previous()}
					</DaisyUiButton>
					<span class="flex items-center px-2">
						{m.page()}
						{currentPage}
						{m.of()}
						{totalPages}
					</span>
					<DaisyUiButton
						className="d-btn-sm"
						disabled={currentPage >= totalPages}
						onClick={() => goToPage(currentPage + 1)}
					>
						{m.next()}
					</DaisyUiButton>
				</div>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
