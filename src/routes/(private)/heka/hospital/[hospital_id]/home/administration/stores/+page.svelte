<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import {
		getStorePaginated,
		deleteStore
	} from '$lib/tool/remote/table/information-table/store.http.tool.svelte';
	import type { StoreSchema } from '$lib/server/db/schema-type';
	import { getBranchesByHospitalId } from '$lib/tool/remote/table/information-table/hospital-branch.http.tool.svelte';
	import { getUserGroupByHospitalId } from '$lib/tool/remote/table/information-table/user-group.http.tool.svelte';
	import { getDepartment } from '$lib/tool/remote/table/master-table/department.http.tool.svelte';
	import { StoreModalState } from '$lib/state/store-modal.state.svelte';
	import StoreFormModal from '$lib/component/own/local/private/heka/administration/store/StoreFormModal.svelte';
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

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	let stores = $state<StoreSchema[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let statusOptions = $state<StatusSchema[]>([]);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	let branchNameById = $state<Map<string, string>>(new Map());
	let userGroupNameById = $state<Map<number, string>>(new Map());
	let departmentNameById = $state<Map<number, string>>(new Map());

	async function loadLookups() {
		if (!hospitalId) return;
		const [branches, ugs, depts] = await Promise.all([
			getBranchesByHospitalId({ hospitalId }),
			getUserGroupByHospitalId({ hospitalId }),
			getDepartment()
		]);
		branchNameById = new Map(
			branches.map((b) => [b.id, b.name ?? b.code ?? b.id])
		);
		userGroupNameById = new Map(
			ugs.map((g) => [g.id, g.name ?? String(g.id)])
		);
		departmentNameById = new Map(
			depts.map((d) => [d.id, d.name ?? d.code ?? String(d.id)])
		);
	}

	const storeColumns: MariTableColumn<StoreSchema>[] = [
		{
			id: 'id',
			header: m.id(),
			widthClass: 'w-16 min-w-[4rem]',
			filterable: false
		},
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
			format: (_v, row) =>
				branchNameById.get(row.branchId) ?? '—'
		},
		{
			id: 'linkType',
			header: m.link_type(),
			widthClass: 'w-36 min-w-[8rem]',
			filterable: false,
			format: (_v, row) =>
				row.userGroupId != null
					? m.linked_user_group()
					: m.linked_department()
		},
		{
			id: 'linked',
			header: m.name(),
			widthClass: 'w-48 min-w-[12rem]',
			filterable: false,
			format: (_v, row) => {
				if (row.userGroupId != null) {
					return (
						userGroupNameById.get(row.userGroupId) ?? '—'
					);
				}
				if (row.departmentId != null) {
					return (
						departmentNameById.get(row.departmentId) ?? '—'
					);
				}
				return '—';
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

	async function fetchStores(forceRefresh = false) {
		if (!hospitalId) return;
		isLoading = true;
		const pageSize = Number(pageSizeStr) || 10;
		try {
			const parsedStatusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const params = {
				hospitalId,
				page: currentPage,
				pageSize,
				name: tableFilters.storeName?.trim() || undefined,
				statusId:
					parsedStatusId != null && Number.isFinite(parsedStatusId)
						? parsedStatusId
						: undefined
			};
			if (forceRefresh) {
				await getStorePaginated(params).refresh();
			}
			const result = await getStorePaginated(params);
			stores = result.data;
			total = result.total;
			totalPages = result.totalPages;
		} finally {
			isLoading = false;
		}
	}

	function goToPage(p: number) {
		currentPage = Math.max(1, Math.min(p, totalPages));
		fetchStores();
	}

	async function loadStatusOptions() {
		statusOptions = await getStatus();
	}

	lifeCycleUtil.onMount(async () => {
		await loadStatusOptions();
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

	async function openEdit(row: StoreSchema) {
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

	async function handleDelete(row: StoreSchema) {
		const result = await dialogService.open({
			title: m.delete_store(),
			message: `Delete "${row.storeName ?? m.stores()}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteStore({ id: row.id });
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
		<DaisyUiButton className="d-btn-primary" onClick={openCreate}>
			<LucidePlus />
			{m.new_store()}
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
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
