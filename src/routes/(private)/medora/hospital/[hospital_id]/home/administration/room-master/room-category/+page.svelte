<script lang="ts">
	import { page } from '$app/state';
	import RoomCategoryFormModal from '$lib/component/own/local/private/medora/administration/room-category/RoomCategoryFormModal.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableEditDeleteActions.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type { RoomCategoryRow } from '$lib/model/type/medora/ipd/ipd.type';
	import { m } from '$lib/paraglide/messages';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { RoomCategoryModalState } from '$lib/state/room-category-modal.state.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	const categoryApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/room-master/room-category`
			: ''
	);

	let rows = $state<RoomCategoryRow[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const categoryColumns: MenziesTableColumn<RoomCategoryRow>[] = [
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
			id: 'roomMarkup',
			header: 'Room markup (%)',
			widthClass: 'w-36 min-w-[8rem]',
			filterable: false,
			format: (_v, row) => `${row.roomMarkup ?? '0'}%`
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
				row.statusId === StatusEnum.ACTIVE ? 'Active' : 'Inactive'
		}
	];

	async function fetchRows() {
		if (!categoryApi) return;
		isLoading = true;
		try {
			const query = new SvelteURLSearchParams({
				page: String(currentPage),
				pageSize: String(Number(pageSizeStr) || 10)
			});
			const name = tableFilters.name?.trim();
			const code = tableFilters.code?.trim();
			const statusId = Number(tableFilters.status);
			if (name) query.set('name', name);
			if (code) query.set('code', code);
			if (Number.isFinite(statusId) && statusId > 0) {
				query.set('statusId', String(statusId));
			}

			const response = await fetch(
				`${categoryApi}?${query.toString()}`,
				{
					credentials: 'include',
					cache: 'no-store'
				}
			);
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				throw new Error(text || `Load failed: ${response.status}`);
			}
			const result = (await response.json()) as {
				data: RoomCategoryRow[];
				total: number;
				totalPages: number;
			};
			rows = result.data;
			total = result.total;
			totalPages = result.totalPages;
		} catch (error) {
			toastService.addToast(
				error instanceof Error
					? error.message
					: 'Unable to load room categories',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	}

	function goToPage(nextPage: number) {
		currentPage = Math.max(1, Math.min(nextPage, totalPages));
		fetchRows();
	}

	lifeCycleUtil.onMount(fetchRows);

	async function openCreate() {
		RoomCategoryModalState.mode = 'create';
		RoomCategoryModalState.editCategory = null;
		const result = await dialogService.open({
			title: 'New Room Category',
			component: RoomCategoryFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function openEdit(row: RoomCategoryRow) {
		RoomCategoryModalState.mode = 'edit';
		RoomCategoryModalState.editCategory = row;
		const result = await dialogService.open({
			title: 'Edit Room Category',
			component: RoomCategoryFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function handleDelete(row: RoomCategoryRow) {
		const result = await dialogService.open({
			title: 'Delete Room Category',
			message: `Delete "${row.name || row.code || `Category ${row.id}`}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed || !categoryApi) return;

		try {
			const response = await fetch(
				`${categoryApi}?id=${encodeURIComponent(String(row.id))}`,
				{ method: 'DELETE', credentials: 'include' }
			);
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				throw new Error(text || `Delete failed: ${response.status}`);
			}
			toastService.addToast(
				'Room category deleted',
				StatusColorEnum.SUCCESS
			);
			fetchRows();
		} catch (error) {
			toastService.addToast(
				error instanceof Error
					? error.message
					: 'Unable to delete room category',
				StatusColorEnum.ERROR
			);
		}
	}
</script>

<div class="space-y-4">
	<div class={TableEnum.HEIGHT}>
		<MenziesTable
			title="Room Categories"
			{rows}
			columns={categoryColumns}
			{isLoading}
			bind:pageSize={pageSizeStr}
			bind:currentPage
			totalRowCount={total}
			showRefreshButton={true}
			refreshTooltip={m.refresh_data()}
			emptyMessage="No room categories found"
			showRowActions={true}
			actionsHeader={m.actions()}
			actionsVariant="none"
			enableColumnFilters={true}
			showAddButton={true}
			addLabel="New Room Category"
			onAdd={openCreate}
			on:refresh={() => fetchRows()}
			on:pageSizeChange={() => {
				currentPage = 1;
				fetchRows();
			}}
			on:pageChange={() => fetchRows()}
			on:filtersChange={(event) => {
				if (filterDebounceTimeout)
					clearTimeout(filterDebounceTimeout);
				tableFilters = event.detail.filters;
				currentPage = 1;
				filterDebounceTimeout = setTimeout(fetchRows, 350);
			}}
		>
			{#snippet rowActions(row)}
				<MenziesTableEditDeleteActions
					onEdit={() => openEdit(row)}
					onDelete={() => handleDelete(row)}
				/>
			{/snippet}
		</MenziesTable>
	</div>
	{#if totalPages > 1}
		<div class="flex justify-center gap-2">
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
</div>
