<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import type { StaffRegUserGroupRow } from '$lib/model/type/heka/staff-reg-ui.type';
	import { UserGroupModalState } from '$lib/state/user-group-modal.state.svelte';
	import { UserGroupPagesModalState } from '$lib/state/user-group-pages-modal.state.svelte';
	import UserGroupFormModal from '$lib/component/own/local/private/heka/administration/user-group/UserGroupFormModal.svelte';
	import UserGroupPagesModal from '$lib/component/own/local/private/heka/administration/user-group/UserGroupPagesModal.svelte';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideList from '$lib/component/own/library/lucide/LucideList.svelte';
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

	let groups = $state<StaffRegUserGroupRow[]>([]);
	let total = $state(0);
	let totalPages = $state(1);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(false);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const userGroupColumns: MariTableColumn<StaffRegUserGroupRow>[] = [
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
						: String(row.statusId)
		}
	];

	function apiUrl(path: string): string {
		return `/api/heka/hospital/${hospitalId}/home/administration/user-group${path}`;
	}

	async function fetchGroups() {
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
			const url = new URL(apiUrl(''), window.location.origin);
			url.searchParams.set('page', String(params.page ?? 1));
			url.searchParams.set('pageSize', String(params.pageSize ?? 10));
			if (params.name) url.searchParams.set('name', params.name);
			if (typeof params.statusId === 'number')
				url.searchParams.set('statusId', String(params.statusId));

			const res = await fetch(url.toString(), {
				method: 'GET',
				headers: { accept: 'application/json' },
				cache: 'no-store',
				credentials: 'include'
			});
			const text = await res.text().catch(() => '');
			if (!res.ok) {
				throw new Error(
					text || `Request failed: ${res.status} ${res.statusText}`
				);
			}
			const parsed = text.trim()
				? (JSON.parse(text) as {
						data: StaffRegUserGroupRow[];
						total: number;
						totalPages: number;
					})
				: { data: [], total: 0, totalPages: 1 };

			groups = parsed.data ?? [];
			total = parsed.total ?? 0;
			totalPages = parsed.totalPages ?? 1;
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchGroups();
	});

	function goToPage(p: number) {
		currentPage = Math.max(1, Math.min(totalPages, p));
		fetchGroups();
	}

	async function openCreate() {
		UserGroupModalState.mode = 'create';
		UserGroupModalState.editGroup = null;
		UserGroupModalState.hospitalId = hospitalId;
		const result = await dialogService.open({
			title: m.new_user_group(),
			component: UserGroupFormModal
		});
		if (result.confirmed) fetchGroups();
	}

	async function openEdit(row: StaffRegUserGroupRow) {
		UserGroupModalState.mode = 'edit';
		UserGroupModalState.editGroup = row;
		UserGroupModalState.hospitalId = hospitalId;
		const result = await dialogService.open({
			title: m.edit_user_group(),
			component: UserGroupFormModal
		});
		if (result.confirmed) fetchGroups();
	}

	async function handleDelete(row: StaffRegUserGroupRow) {
		const result = await dialogService.open({
			title: m.delete_user_group(),
			message: `Delete "${row.name ?? 'this group'}"?`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			const res = await fetch(apiUrl(''), {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				cache: 'no-store',
				credentials: 'include',
				body: JSON.stringify({ id: row.id })
			});
			const text = await res.text().catch(() => '');
			if (!res.ok) {
				throw new Error(
					text || `Request failed: ${res.status} ${res.statusText}`
				);
			}
			toastService.addToast(
				m.user_group_deleted(),
				StatusColorEnum.SUCCESS
			);
			fetchGroups();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}

	async function openPagesModal(row: StaffRegUserGroupRow) {
		UserGroupPagesModalState.group = row;
		const result = await dialogService.open({
			title: m.manage_page_access(),
			component: UserGroupPagesModal,
			modalClassName:
				'max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto'
		});
		if (result.confirmed) fetchGroups();
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
						on:refresh={() => fetchGroups()}
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
						{#snippet rowActions(row, rowIndex)}
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
