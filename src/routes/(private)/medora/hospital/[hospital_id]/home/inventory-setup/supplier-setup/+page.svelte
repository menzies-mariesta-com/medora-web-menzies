<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import SupplierFormModal from '$lib/component/own/local/private/medora/inventory-setup/supplier-setup/SupplierFormModal.svelte';
	import { SupplierModalState } from '$lib/state/supplier-modal.state.svelte';
	import type {
		SupplierListRow,
		StatusListRow
	} from '$lib/model/type/medora/ui-rows.type';
	import { StatusEnum } from '$lib/model/enum/db-link';
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
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/inventory-setup/supplier-setup`
			: ''
	);

	let rows = $state<SupplierListRow[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let statusOptions = $state<StatusListRow[]>([]);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const columns: MenziesTableColumn<SupplierListRow>[] = [
		{
			id: 'name',
			header: m.supplier_name(),
			widthClass: 'w-44 min-w-[10rem]',
			filterable: true,
			field: 'name'
		},
		{
			id: 'code',
			header: m.supplier_code(),
			widthClass: 'w-32 min-w-[8rem]',
			filterable: true,
			field: 'code',
			format: (v) => v ?? '—'
		},
		{
			id: 'city',
			header: m.city(),
			widthClass: 'w-36 min-w-[8rem]',
			filterable: false,
			format: (_v, row) => row.cityName ?? '—'
		},
		{
			id: 'phone',
			header: m.phone(),
			widthClass: 'w-36 min-w-[8rem]',
			filterable: true,
			field: 'phone',
			format: (v) => v ?? '—'
		},
		{
			id: 'email',
			header: m.email(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (v) => v ?? '—'
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: m.active_label(), value: String(StatusEnum.ACTIVE) },
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
			const search = tableFilters.name?.trim();
			const code = tableFilters.code?.trim();
			const phone = tableFilters.phone?.trim();
			if (search) parts.push(`search=${encodeURIComponent(search)}`);
			if (code) parts.push(`code=${encodeURIComponent(code)}`);
			if (phone) parts.push(`phone=${encodeURIComponent(phone)}`);
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
				data: SupplierListRow[];
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
		SupplierModalState.mode = 'create';
		SupplierModalState.editRow = null;
		const result = await dialogService.open({
			title: m.new_supplier(),
			component: SupplierFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function openEdit(row: SupplierListRow) {
		SupplierModalState.mode = 'edit';
		SupplierModalState.editRow = row;
		const result = await dialogService.open({
			title: m.edit_supplier(),
			component: SupplierFormModal
		});
		if (result.confirmed) fetchRows();
	}

	async function handleDelete(row: SupplierListRow) {
		const result = await dialogService.open({
			title: m.delete_supplier(),
			message: `Delete="${row.name ?? m.supplier_setup_title()}"?`,
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
				m.supplier_deleted(),
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
		<h1 class="text-2xl font-bold">{m.supplier_setup_title()}</h1>
		<WashButton className="btn-primary" onClick={openCreate}>
			<LucidePlus />
			{m.new_supplier()}
		</WashButton>
	</div>

	<WashCard>
		<WashCardBody>
			<div class={TableEnum.HEIGHT}>
				<MenziesTable
					{rows}
					{columns}
					{isLoading}
					bind:pageSize={pageSizeStr}
					bind:currentPage
					totalRowCount={total}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					emptyMessage={m.no_suppliers_create()}
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
