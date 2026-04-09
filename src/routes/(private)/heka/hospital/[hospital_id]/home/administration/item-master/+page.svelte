<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import { ItemMasterModalState } from '$lib/state/item-master-modal.state.svelte';
	import ItemMasterFormModal from '$lib/component/own/local/private/heka/administration/item-master/ItemMasterFormModal.svelte';
	import type {
		ItemMasterListRow,
		StatusListRow
	} from '$lib/model/type/heka/ui-rows.type';
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

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	const itemMasterApi = $derived(
		hospitalId
			? `/api/heka/hospital/${hospitalId}/home/administration/item-master`
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
	let unitNameById = $state<Map<number, string>>(new Map());

	async function loadLookups() {
		if (!itemMasterApi) return;
		const [catsRes, unitsRes] = await Promise.all([
			fetch(`${itemMasterApi}?mode=categories`, {
				credentials: 'include',
				cache: 'no-store'
			}),
			fetch(`${itemMasterApi}?mode=units`, {
				credentials: 'include',
				cache: 'no-store'
			})
		]);
		if (!catsRes.ok || !unitsRes.ok) return;
		const cats = (await catsRes.json()) as {
			id: number;
			categoryName?: string | null;
		}[];
		const u = (await unitsRes.json()) as { id: number; name?: string | null }[];
		categoryNameById = new Map(
			cats.map((c) => [c.id, c.categoryName ?? String(c.id)])
		);
		unitNameById = new Map(
			u.map((x) => [x.id, x.name ?? String(x.id)])
		);
	}

	const columns: MariTableColumn<ItemMasterListRow>[] = [
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
			filterOptions: [
				{
					label: 'General Supply',
					value: '11'
				},
				{
					label: 'Pharmacy Supply',
					value: '12'
				},
				{
					label: 'Medical Supply',
					value: '13'
				}
			],
			format: (_v, row) =>
				categoryNameById.get(row.categoryId) ?? '—'
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
			id: 'barcode',
			header: m.item_master_barcode(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: true,
			field: 'barcode',
			format: (v) => v ?? '—'
		},
		{
			id: 'unitId',
			header: m.item_master_unit(),
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false,
			format: (_v, row) =>
				row.unitId != null
					? (unitNameById.get(row.unitId) ?? '—')
					: '—'
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
			const barcode = tableFilters.barcode?.trim();
			if (name) qs.set('name', name);
			if (itemCode) qs.set('itemCode', itemCode);
			if (barcode) qs.set('barcode', barcode);
			if (
				parsedCategoryId != null &&
				Number.isFinite(parsedCategoryId)
			) {
				qs.set('categoryId', String(parsedCategoryId));
			}
			if (
				parsedStatusId != null &&
				Number.isFinite(parsedStatusId)
			) {
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
		const res = await fetch('/api/heka/master/status', {
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
			message: `Delete "${row.itemName ?? m.item_master()}"?`,
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
		<DaisyUiButton className="d-btn-primary" onClick={openCreate}>
			<LucidePlus />
			{m.new_item_master()}
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					rows={rows}
					columns={columns}
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
