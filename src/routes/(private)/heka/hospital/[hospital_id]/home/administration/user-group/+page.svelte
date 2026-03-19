<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import {
		getUserGroupPaginated,
		deleteUserGroup,
		type UserGroupSchema
	} from '$lib/remote/table/information-table/user-group.remote';
	import { UserGroupModalState } from '$lib/state/user-group-modal.state.svelte';
	import { UserGroupPagesModalState } from '$lib/state/user-group-pages-modal.state.svelte';
	import UserGroupFormModal from '$lib/component/local/private/heka/administration/user-group/UserGroupFormModal.svelte';
	import UserGroupPagesModal from '$lib/component/local/private/heka/administration/user-group/UserGroupPagesModal.svelte';
	import type { StatusSchema } from '$lib/server/db/schema-type';
	import { getStatus } from '$lib/remote/table/master-table/status.remote';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucideList from '$lib/component/library/lucide/LucideList.svelte';
	import { m } from '$lib/paraglide/messages';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
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

	let groups = $state<UserGroupSchema[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let statusOptions = $state<StatusSchema[]>([]);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const userGroupColumns: MariTableColumn<UserGroupSchema>[] = [
		{
			id: 'id',
			header: m.id(),
			widthClass: 'w-16 min-w-[4rem]',
			filterable: false
		},
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-64 min-w-[12rem]',
			filterable: true,
			field: 'name'
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

	async function fetchGroups(forceRefresh = false) {
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
				name: tableFilters.name?.trim() || undefined,
				statusId:
					parsedStatusId != null && Number.isFinite(parsedStatusId)
						? parsedStatusId
						: undefined
			};
			// After create/update/delete, invalidate cache then fetch so list updates
			if (forceRefresh) {
				await getUserGroupPaginated(params).refresh();
			}
			const result = await getUserGroupPaginated(params);
			groups = result.data;
			total = result.total;
			totalPages = result.totalPages;
		} finally {
			isLoading = false;
		}
	}

	async function loadStatusOptions() {
		statusOptions = await getStatus();
	}

	lifeCycleUtil.onMount(() => {
		loadStatusOptions();
		fetchGroups();
	});

	async function openCreate() {
		UserGroupModalState.mode = 'create';
		UserGroupModalState.editGroup = null;
		UserGroupModalState.hospitalId = hospitalId;
		const result = await dialogService.open({
			title: m.new_user_group(),
			component: UserGroupFormModal
		});
		if (result.confirmed) fetchGroups(true);
	}

	async function openEdit(row: UserGroupSchema) {
		UserGroupModalState.mode = 'edit';
		UserGroupModalState.editGroup = row;
		UserGroupModalState.hospitalId = hospitalId;
		const result = await dialogService.open({
			title: m.edit_user_group(),
			component: UserGroupFormModal
		});
		if (result.confirmed) fetchGroups(true);
	}

	async function handleDelete(row: UserGroupSchema) {
		const result = await dialogService.open({
			title: m.delete_user_group(),
			message: `Delete "${row.name ?? 'this group'}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteUserGroup({ id: row.id });
			toastService.addToast(
				m.user_group_deleted(),
				StatusColorEnum.SUCCESS
			);
			fetchGroups(true);
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}

	async function openPagesModal(row: UserGroupSchema) {
		UserGroupPagesModalState.group = row;
		const result = await dialogService.open({
			title: m.manage_page_access(),
			component: UserGroupPagesModal,
			modalClassName:
				'max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto'
		});
		if (result.confirmed) fetchGroups(true);
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">{m.user_groups()}</h1>
		<DaisyUiButton className="d-btn-primary" onClick={openCreate}>
			<LucidePlus />
			{m.new_user_group()}
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if isLoading && groups.length === 0}
				<DaisyUiLoading className="py-8" />
			{:else}
				<div class={TableEnum.HEIGHT}>
					<MariTable
						rows={groups}
						columns={userGroupColumns}
						{isLoading}
						bind:pageSize={pageSizeStr}
						bind:currentPage
						totalRowCount={total}
						showRefreshButton={true}
						refreshTooltip={m.refresh_data()}
						emptyMessage={m.no_user_groups_create()}
						showRowActions={true}
						actionsHeader={m.actions()}
						actionsVariant="none"
						enableColumnFilters={true}
						useRemoteFilters={true}
						on:refresh={() => fetchGroups(true)}
						on:pageSizeChange={() => {
							currentPage = 1;
							fetchGroups();
						}}
						on:pageChange={() => fetchGroups()}
						on:filtersChange={(event) => {
							if (filterDebounceTimeout) {
								clearTimeout(filterDebounceTimeout);
							}
							tableFilters = event.detail.filters;
							currentPage = 1;
							filterDebounceTimeout = setTimeout(() => {
								fetchGroups();
							}, 350);
						}}
					>
						<svelte:fragment slot="rowActions" let:row>
							<td class="text-right">
								<div class="flex justify-end gap-2">
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										onClick={() => openPagesModal(row)}
										title="Manage which pages this group can access"
									>
										<LucideList />
										{m.pages()}
									</DaisyUiButton>
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
						</svelte:fragment>
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
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
