<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import ItemUnitMasterFormModal from '$lib/component/own/local/private/heka/inventory-setup/item-unit-master/ItemUnitMasterFormModal.svelte';
	import { ItemUnitMasterModalState } from '$lib/state/item-unit-master-modal.state.svelte';
	import type {
		ItemUnitMasterListRow,
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
	const apiBase = $derived(
		hospitalId
			? `/api/heka/hospital/${hospitalId}/home/inventory-setup/item-unit-master`
			: ''
	);

	let rows = $state<ItemUnitMasterListRow[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let statusOptions = $state<StatusListRow[]>([]);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const columns: MariTableColumn<ItemUnitMasterListRow>[] = [
		{
			id: 'id',
			header: m.id(),
			widthClass: 'w-14 min-w-[3.5rem]',
			filterable: false
		},
		{
			id: 'conversionDisplay',
			header: m.item_unit_master_preview(),
			widthClass: 'min-w-[14rem]',
			filterable: false,
			format: (_v, row) => row.conversionDisplay
		},
		{
			id: 'purchase',
			header: m.item_unit_master_purchase_unit(),
			widthClass: 'w-36 min-w-[8rem]',
			filterable: false,
			format: (_v, row) =>
				`${row.purchaseUnitName ?? row.purchaseUnitId} (${Number.isFinite(Number(row.purchaseConversionFactor)) ? Number(row.purchaseConversionFactor).toFixed(2) : row.purchaseConversionFactor})`
		},
		{
			id: 'issue',
			header: m.item_unit_master_issue_unit(),
			widthClass: 'w-36 min-w-[8rem]',
			filterable: false,
			format: (_v, row) =>
				`${row.issueUnitName ?? row.issueUnitId} (${Number.isFinite(Number(row.issueConversionFactor)) ? Number(row.issueConversionFactor).toFixed(2) : row.issueConversionFactor})`
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-36 min-w-[9rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: m.active_label(), value: String(StatusEnum.ACTIVE) },
				{ label: m.inactive_label(), value: String(StatusEnum.INACTIVE) }
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE
					? m.active_label()
					: row.statusId === StatusEnum.INACTIVE
						? m.inactive_label()
						: (statusOptions.find((s) => s.id === row.statusId)
								?.name ?? String(row.statusId))
		}
	];

	async function fetchRows() {
		if (!apiBase) return;
		isLoading = true;
		const pageSize = Number(pageSizeStr) || 10;
		try {
			const parsedStatusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const parts = [
				`page=${encodeURIComponent(String(currentPage))}`,
				`pageSize=${encodeURIComponent(String(pageSize))}`
			];
			const search = tableFilters.search?.trim();
			if (search) parts.push(`search=${encodeURIComponent(search)}`);
			if (
				parsedStatusId != null &&
				Number.isFinite(parsedStatusId)
			) {
				parts.push(`statusId=${encodeURIComponent(String(parsedStatusId))}`);
			}
			const res = await fetch(`${apiBase}?${parts.join('&')}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Load failed: ${res.status}`);
			}
			const result = (await res.json()) as {
				data: ItemUnitMasterListRow[];
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
		fetchRows();
	});

	async function openCreate() {
		ItemUnitMasterModalState.mode = 'create';
		ItemUnitMasterModalState.editRow = null;
		const result = await dialogService.open({
			title: m.new_item_unit_master(),
			component: ItemUnitMasterFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function openEdit(row: ItemUnitMasterListRow) {
		ItemUnitMasterModalState.mode = 'edit';
		ItemUnitMasterModalState.editRow = row;
		const result = await dialogService.open({
			title: m.edit_item_unit_master(),
			component: ItemUnitMasterFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function handleDelete(row: ItemUnitMasterListRow) {
		const result = await dialogService.open({
			title: m.delete_item_unit_master(),
			message: `Remove conversion "${row.conversionDisplay}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed || !apiBase) return;
		try {
			const res = await fetch(
				`${apiBase}?id=${encodeURIComponent(String(row.id))}`,
				{ method: 'DELETE', credentials: 'include' }
			);
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Delete failed: ${res.status}`);
			}
			toastService.addToast(
				m.item_unit_master_deleted(),
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
		<h1 class="text-2xl font-bold">{m.item_unit_master_title()}</h1>
		<DaisyUiButton className="d-btn-primary" onClick={openCreate}>
			<LucidePlus />
			{m.new_item_unit_master()}
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					rows={rows}
					{columns}
					{isLoading}
					bind:pageSize={pageSizeStr}
					bind:currentPage
					totalRowCount={total}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					emptyMessage={m.no_item_unit_profiles()}
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
					{#snippet rowActions(row, index)}
						<td class="text-right" data-row-index={index}>
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
