<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import { ItemMasterModalState } from '$lib/state/item-master-modal.state.svelte';
	import ItemMasterFormModal from '$lib/component/own/local/private/medora/inventory-setup/item-master/ItemMasterFormModal.svelte';
	import type {
		ItemMasterListRow,
		StatusListRow
	} from '$lib/model/type/medora/ui-rows.type';
	import { CategoryEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import MenziesTableEditDeleteActions from '$lib/component/own/library/menzies/table/MenziesTableEditDeleteActions.svelte';
	import { m } from '$lib/paraglide/messages';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
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
	const itemMasterApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master`
			: ''
	);

	let rows = $state<ItemMasterListRow[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let statusOptions = $state<StatusListRow[]>([]);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	let categoryNameById = $state<Map<number, string>>(new Map());

	async function loadLookups() {
		if (!itemMasterApi) return;
		const catsRes = await fetch(`${itemMasterApi}?mode=categories`, {
			credentials: 'include',
			cache: 'no-store'
		});
		if (!catsRes.ok) return;
		const cats = (await catsRes.json()) as {
			id: number;
			categoryName?: string | null;
		}[];
		categoryNameById = new Map(
			cats.map((c) => [c.id, c.categoryName ?? String(c.id)])
		);
	}

	const columns: MenziesTableColumn<ItemMasterListRow>[] = [
		{
			id: 'id',
			header: m.id(),
			widthClass: 'w-16 min-w-[4rem]',
			filterable: false
		},
		{
			id: 'itemName',
			header: m.item_master_item_name(),
			widthClass: 'w-52 min-w-[12rem]',
			filterable: true,
			field: 'itemName'
		},
		{
			id: 'categoryId',
			header: m.service_item_category_label(),
			widthClass: 'w-48 min-w-[11rem]',
			filterable: true,
			filterType: 'select',
			filterMasterKey: 'itemCategory',
			format: (_v, row) => categoryNameById.get(row.categoryId) ?? '—'
		},
		{
			id: 'pharmacyGeneric',
			header: m.item_master_pharmacy_generic(),
			widthClass: 'w-48 min-w-[11rem]',
			filterable: false,
			format: (_v, row) =>
				row.categoryId === CategoryEnum.PHARMACY_SUPPLY
					? (row.pharmacyGenericName ?? '—')
					: '—'
		},
		{
			id: 'manufacturerName',
			header: m.item_master_manufacturer(),
			widthClass: 'w-44 min-w-[10rem]',
			filterable: false,
			field: 'manufacturerName',
			format: (v) => (v != null && String(v).trim() !== '' ? String(v) : '—')
		},
		{
			id: 'itemCode',
			header: m.item_master_code(),
			widthClass: 'w-36 min-w-[8rem]',
			filterable: true,
			field: 'itemCode',
			format: (v) => v ?? '—'
		},
		{
			id: 'expiryAlertLeadDays',
			header: m.item_master_expiry_alert_lead_days(),
			widthClass: 'w-36 min-w-[9rem]',
			filterable: false,
			field: 'expiryAlertLeadDays',
			format: (v) =>
				v != null && Number.isFinite(Number(v)) ? String(v) : '—'
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
		if (!itemMasterApi) return;
		isLoading = true;
		const pageSize = Number(pageSizeStr) || 10;
		try {
			const parsedStatusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const parsedCategoryId = tableFilters.categoryId
				? Number(tableFilters.categoryId)
				: undefined;
			const qs = new URLSearchParams();
			qs.set('page', String(currentPage));
			qs.set('pageSize', String(pageSize));
			const name = tableFilters.itemName?.trim();
			const itemCode = tableFilters.itemCode?.trim();
			if (name) qs.set('name', name);
			if (itemCode) qs.set('itemCode', itemCode);
			if (
				parsedCategoryId != null &&
				Number.isFinite(parsedCategoryId)
			) {
				qs.set('categoryId', String(parsedCategoryId));
			}
			if (parsedStatusId != null && Number.isFinite(parsedStatusId)) {
				qs.set('statusId', String(parsedStatusId));
			}
			const res = await fetch(`${itemMasterApi}?${qs.toString()}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Load failed: ${res.status}`);
			}
			const result = (await res.json()) as {
				data: ItemMasterListRow[];
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

	lifeCycleUtil.onMount(async () => {
		await loadStatusOptions();
		await loadLookups();
		fetchRows();
	});

	async function openCreate() {
		ItemMasterModalState.mode = 'create';
		ItemMasterModalState.editItem = null;
		const result = await dialogService.open({
			title: m.new_item_master(),
			component: ItemMasterFormModal
		});
		if (result.confirmed) {
			await loadLookups();
			fetchRows();
		}
	}

	async function openEdit(row: ItemMasterListRow) {
		ItemMasterModalState.mode = 'edit';
		ItemMasterModalState.editItem = row;
		const result = await dialogService.open({
			title: m.edit_item_master(),
			component: ItemMasterFormModal
		});
		if (result.confirmed) {
			await loadLookups();
			fetchRows();
		}
	}

	async function handleDelete(row: ItemMasterListRow) {
		const result = await dialogService.open({
			title: m.delete_item_master(),
			message: `Delete="${row.itemName ?? m.item_master()}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		if (!itemMasterApi) return;
		try {
			const res = await fetch(
				`${itemMasterApi}?id=${encodeURIComponent(String(row.id))}`,
				{ method: 'DELETE', credentials: 'include' }
			);
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Delete failed: ${res.status}`);
			}
			toastService.addToast(
				m.item_master_deleted(),
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
		<h1 class="text-2xl font-bold">{m.item_master()}</h1>
		<WashButton className="btn-primary" onClick={openCreate}>
			<LucidePlus />
			{m.new_item_master()}
		</WashButton>
	</div>

	<WashCard>
		<WashCardBody>
			<div class={TableEnum.HEIGHT}>
				<MenziesTable
					{rows}
					{columns}
					masterFilterHospitalId={hospitalId}
					{isLoading}
					bind:pageSize={pageSizeStr}
					bind:currentPage
					totalRowCount={total}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					emptyMessage={m.no_items_master_create()}
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
						<MenziesTableEditDeleteActions
							onEdit={() => openEdit(row)}
							onDelete={() => handleDelete(row)}
						/>
					{/snippet}
				</MenziesTable>
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
