<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import UnitMasterFormModal from '$lib/component/own/local/private/medora/inventory-setup/unit-master/UnitMasterFormModal.svelte';
	import { UnitMasterModalState } from '$lib/state/unit-master-modal.state.svelte';
	import type {
		UnitMasterListRow,
		StatusListRow
	} from '$lib/model/type/medora/ui-rows.type';
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
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/inventory-setup/unit-master`
			: ''
	);

	let rows = $state<UnitMasterListRow[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let statusOptions = $state<StatusListRow[]>([]);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const columns = $derived.by(
		(): MariTableColumn<UnitMasterListRow>[] => [
			{
				id: 'name',
				header: m.unit_master_name(),
				widthClass: 'w-52 min-w-[12rem]',
				filterable: true,
				field: 'name'
			},
			{
				id: 'unitTypeId',
				header: m.unit_master_unit_type(),
				widthClass: 'w-44 min-w-[10rem]',
				filterable: true,
				filterType: 'select',
				filterMasterKey: 'unitType',
				format: (_v, row) => row.unitTypeName ?? '—'
			},
			{
				id: 'status',
				header: m.status(),
				widthClass: 'w-40 min-w-[10rem]',
				filterable: true,
				filterType: 'select',
				filterOptions: [
					{
						label: m.active_label(),
						value: String(StatusEnum.ACTIVE)
					},
					{
						label: m.inactive_label(),
						value: String(StatusEnum.INACTIVE)
					}
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
		]
	);

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
			const search = tableFilters.name?.trim();
			if (search) parts.push(`search=${encodeURIComponent(search)}`);
			const unitTypeId =
				tableFilters.unitTypeId != null &&
				tableFilters.unitTypeId !== ''
					? Number(tableFilters.unitTypeId)
					: undefined;
			if (unitTypeId != null && Number.isFinite(unitTypeId)) {
				parts.push(
					`unitTypeId=${encodeURIComponent(String(unitTypeId))}`
				);
			}
			if (parsedStatusId != null && Number.isFinite(parsedStatusId)) {
				parts.push(
					`statusId=${encodeURIComponent(String(parsedStatusId))}`
				);
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
				data: UnitMasterListRow[];
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
		fetchRows();
	});

	async function openCreate() {
		UnitMasterModalState.mode = 'create';
		UnitMasterModalState.editRow = null;
		const result = await dialogService.open({
			title: m.new_unit_master(),
			component: UnitMasterFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function openEdit(row: UnitMasterListRow) {
		UnitMasterModalState.mode = 'edit';
		UnitMasterModalState.editRow = row;
		const result = await dialogService.open({
			title: m.edit_unit_master(),
			component: UnitMasterFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function handleDelete(row: UnitMasterListRow) {
		const result = await dialogService.open({
			title: m.delete_unit_master(),
			message: `Delete="${row.name ?? m.unit_master_title()}"?`,
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
				m.unit_master_deleted(),
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
		<h1 class="text-2xl font-bold">{m.unit_master_title()}</h1>
		<WashButton className="btn-primary" onClick={openCreate}>
			<LucidePlus />
			{m.new_unit_master()}
		</WashButton>
	</div>

	<WashCard>
		<WashCardBody>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					{rows}
					{columns}
					masterFilterHospitalId={hospitalId}
					{isLoading}
					bind:pageSize={pageSizeStr}
					bind:currentPage
					totalRowCount={total}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					emptyMessage={m.unit_master_empty()}
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
