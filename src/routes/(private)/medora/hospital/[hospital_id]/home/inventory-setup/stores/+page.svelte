<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import type {
		StoreListRow,
		StatusListRow
	} from '$lib/model/type/medora/ui-rows.type';
	import type { StaffRegUserGroupRow } from '$lib/model/type/medora/staff-reg-ui.type';
	import { StoreModalState } from '$lib/state/store-modal.state.svelte';
	import StoreFormModal from '$lib/component/own/local/private/medora/inventory-setup/store/StoreFormModal.svelte';
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

	let stores = $state<StoreListRow[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let statusOptions = $state<StatusListRow[]>([]);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	let branchNameById = $state<Map<string, string>>(new Map());

	type StoreLookups = {
		userGroups: StaffRegUserGroupRow[];
		statuses: StatusListRow[];
	};

	async function fetchBranchesAll(hid: string) {
		const res = await fetch(
			`/api/medora/hospital/${hid}/home/administration/branches?mode=all`,
			{ method: 'GET' }
		);
		if (!res.ok) {
			throw new Error(`Failed to load branches (${res.status})`);
		}
		return (await res.json()) as {
			id: string;
			name?: string | null;
			code?: string | null;
		}[];
	}

	async function fetchStoreLookups(
		hid: string
	): Promise<StoreLookups> {
		const res = await fetch(
			`/api/medora/hospital/${hid}/home/inventory-setup/stores?mode=lookups`,
			{ method: 'GET' }
		);
		if (!res.ok) {
			throw new Error(`Failed to load lookups (${res.status})`);
		}
		return (await res.json()) as StoreLookups;
	}

	async function loadLookups() {
		if (!hospitalId) return;
		const [branches, lookups] = await Promise.all([
			fetchBranchesAll(hospitalId),
			fetchStoreLookups(hospitalId)
		]);
		branchNameById = new Map(
			branches.map((b) => [b.id, b.name ?? b.code ?? b.id])
		);
		statusOptions = lookups.statuses;
	}

	const storeColumns: MariTableColumn<StoreListRow>[] = [
		{
			id: 'storeName',
			header: m.store_name(),
			widthClass: 'w-56 min-w-[12rem]',
			filterable: true,
			field: 'storeName'
		},
		{
			id: 'branch',
			header: m.branches(),
			widthClass: 'w-44 min-w-[10rem]',
			filterable: false,
			format: (_v, row) => branchNameById.get(row.branchId) ?? '—'
		},
		{
			id: 'requisitable',
			header: m.inv_store_purchase_requisitable(),
			widthClass: 'w-24',
			filterable: false,
			format: (_v, row) => (row.isPurchaseRequisitable ? 'Yes' : '—')
		},
		{
			id: 'userGroups',
			header: m.user_groups(),
			widthClass: 'w-64 min-w-[14rem]',
			filterable: false,
			format: (_v, row) => {
				const names = (row.userGroups ?? [])
					.map((g) => g.name ?? `#${g.id}`)
					.filter((n) => n.length > 0);
				return names.length > 0 ? names.join(', ') : '—';
			}
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

	type StoresPaginatedResponse = {
		data: StoreListRow[];
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};

	async function fetchStores(forceRefresh = false) {
		if (!hospitalId) return;
		isLoading = true;
		const pageSize = Number(pageSizeStr) || 10;
		try {
			const parsedStatusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const sp = new URLSearchParams();
			sp.set('page', String(currentPage));
			sp.set('pageSize', String(pageSize));
			const name = tableFilters.storeName?.trim() || '';
			if (name) sp.set('name', name);
			if (parsedStatusId != null && Number.isFinite(parsedStatusId)) {
				sp.set('statusId', String(parsedStatusId));
			}
			if (forceRefresh) sp.set('_t', String(Date.now()));

			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory-setup/stores?${sp.toString()}`,
				{ method: 'GET' }
			);
			if (!res.ok) {
				throw new Error(`Failed to load stores (${res.status})`);
			}
			const result = (await res.json()) as StoresPaginatedResponse;
			stores = result.data ?? [];
			total = result.total ?? 0;
			totalPages = result.totalPages ?? 1;
		} finally {
			isLoading = false;
		}
	}

	function goToPage(p: number) {
		currentPage = Math.max(1, Math.min(p, totalPages));
		fetchStores();
	}

	lifeCycleUtil.onMount(async () => {
		if (hospitalId) {
			await loadLookups();
			fetchStores();
		}
	});

	async function openCreate() {
		StoreModalState.mode = 'create';
		StoreModalState.editStore = null;
		StoreModalState.hospitalId = hospitalId;
		const result = await dialogService.open({
			title: m.new_store(),
			component: StoreFormModal
		});
		if (result.confirmed) {
			await loadLookups();
			fetchStores(true);
		}
	}

	async function openEdit(row: StoreListRow) {
		StoreModalState.mode = 'edit';
		StoreModalState.editStore = row;
		StoreModalState.hospitalId = hospitalId;
		const result = await dialogService.open({
			title: m.edit_store(),
			component: StoreFormModal
		});
		if (result.confirmed) {
			await loadLookups();
			fetchStores(true);
		}
	}

	async function handleDelete(row: StoreListRow) {
		const result = await dialogService.open({
			title: m.delete_store(),
			message: `Delete="${row.storeName ?? m.stores()}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory-setup/stores`,
				{
					method: 'DELETE',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ id: row.id })
				}
			);
			if (!res.ok) {
				throw new Error(`Delete failed (${res.status})`);
			}
			toastService.addToast(
				m.store_deleted(),
				StatusColorEnum.SUCCESS
			);
			fetchStores(true);
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">{m.stores()}</h1>
		<div class="flex flex-wrap items-center gap-2">
			<WashButton className="btn-primary" onClick={openCreate}>
				<LucidePlus />
				{m.new_store()}
			</WashButton>
		</div>
	</div>

	<WashCard>
		<WashCardBody>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					rows={stores}
					columns={storeColumns}
					{isLoading}
					bind:pageSize={pageSizeStr}
					bind:currentPage
					totalRowCount={total}
					showRefreshButton={true}
					refreshTooltip={m.refresh_data()}
					emptyMessage={m.no_stores_create()}
					showRowActions={true}
					actionsHeader={m.actions()}
					actionsVariant="none"
					enableColumnFilters={true}
					useRemoteFilters={true}
					on:refresh={() => fetchStores(true)}
					on:pageSizeChange={() => {
						currentPage = 1;
						fetchStores();
					}}
					on:pageChange={() => fetchStores()}
					on:filtersChange={(event) => {
						if (filterDebounceTimeout) {
							clearTimeout(filterDebounceTimeout);
						}
						tableFilters = event.detail.filters;
						currentPage = 1;
						filterDebounceTimeout = setTimeout(() => {
							fetchStores();
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
