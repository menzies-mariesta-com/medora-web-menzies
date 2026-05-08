<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import type { StaffRegHospitalBranchRow } from '$lib/model/type/heka/staff-reg-ui.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { BranchModalState } from '$lib/state/branch-modal.state.svelte';
	import BranchFormModal from '$lib/component/own/local/private/heka/administration/branches/BranchFormModal.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import { m } from '$lib/paraglide/messages';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const createLock = createActionLock();
	const editLock = createActionLock();
	const deleteLock = createActionLock();

	let editingBranchId = $state<string | null>(null);
	let deletingBranchId = $state<string | null>(null);

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	let branchResult =
		$state<PaginatedResult<StaffRegHospitalBranchRow> | null>(null);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(true);

	const branches = $derived(branchResult?.data ?? []);
	const total = $derived(branchResult?.total ?? 0);

	let tableFilters = $state<Record<string, string>>({});

	const branchColumns: MariTableColumn<StaffRegHospitalBranchRow>[] = [
		{
			id: 'no',
			header: 'No.',
			widthClass: 'w-16 min-w-[4rem]',
			filterable: false,
			format: (_value, _row, rowIndex) => {
				const pageSize = Number(pageSizeStr) || 10;
				return (currentPage - 1) * pageSize + rowIndex + 1;
			}
		},
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-64 min-w-[12rem]',
			filterable: false,
			field: 'name'
		},
		{
			id: 'code',
			header: m.code(),
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false,
			field: 'code'
		},
		{
			id: 'phone',
			header: m.phone(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			field: 'phone'
		},
		{
			id: 'email',
			header: m.email(),
			widthClass: 'w-56 min-w-[14rem]',
			filterable: false,
			field: 'email'
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-28 min-w-[7rem]',
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
						: row.statusId === StatusEnum.DELETED
							? 'Deleted'
							: `Status ${row.statusId ?? 'Unknown'}`
		},
		{
			id: 'address',
			header: m.address(),
			widthClass: 'w-80 min-w-[16rem]',
			filterable: false,
			format: (_value, row) => row.address ?? '—',
			cellClass: 'max-w-[200px] truncate'
		}
	];

	async function fetchBranches(forceRefresh = false) {
		if (!hospitalId) return;
		isLoading = true;
		const pageSize = Number(pageSizeStr) || 10;
		const parsedStatusId = tableFilters.status
			? Number(tableFilters.status)
			: undefined;
		try {
			const url = new URL(
				`/api/heka/hospital/${hospitalId}/home/administration/branches`,
				globalThis.location?.origin ?? 'http://localhost'
			);
			url.searchParams.set('page', String(currentPage));
			url.searchParams.set('pageSize', String(pageSize));

			const statusId =
				parsedStatusId != null && Number.isFinite(parsedStatusId)
					? parsedStatusId
					: undefined;
			if (statusId != null) url.searchParams.set('statusId', String(statusId));

			const res = await fetch(url.pathname + url.search, {
				method: 'GET',
				cache: forceRefresh ? 'no-store' : 'default'
			});
			if (!res.ok) {
				throw new Error(`Failed to load branches (${res.status})`);
			}
			branchResult =
				(await res.json()) as PaginatedResult<StaffRegHospitalBranchRow>;
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchBranches();
	});

	async function openCreate() {
		await createLock.run(async () => {
			BranchModalState.hospitalId = hospitalId;
			BranchModalState.branchId = null;
			const result = await dialogService.open({
				title: m.new_branch(),
				component: BranchFormModal
			});
			if (result.confirmed) fetchBranches(true);
		});
	}

	async function openEdit(row: StaffRegHospitalBranchRow) {
		await editLock.run(async () => {
			editingBranchId = row.id;
			try {
				BranchModalState.hospitalId = hospitalId;
				BranchModalState.branchId = row.id;
				const result = await dialogService.open({
					title: m.edit_branch(),
					component: BranchFormModal
				});
				if (result.confirmed) fetchBranches(true);
			} finally {
				editingBranchId = null;
			}
		});
	}

	async function handleDelete(row: StaffRegHospitalBranchRow) {
		await deleteLock.run(async () => {
			deletingBranchId = row.id;
			try {
				const result = await dialogService.open({
					title: m.delete_branch(),
					message: `Delete "${row.name ?? row.code ?? 'this branch'}"? This cannot be undone.`,
					variant: DialogVariantEnum.CONFIRM
				});
				if (!result.confirmed) return;
				try {
					const res = await fetch(
						`/api/heka/hospital/${hospitalId}/home/administration/branches`,
						{
							method: 'DELETE',
							headers: { 'content-type': 'application/json' },
							body: JSON.stringify({ id: row.id })
						}
					);
					if (!res.ok) {
						throw new Error(`Failed to delete branch (${res.status})`);
					}
					toastService.addToast(
						m.branch_deleted(),
						StatusColorEnum.SUCCESS
					);
					fetchBranches(true);
				} catch (err) {
					const msg =
						err instanceof Error ? err.message : m.delete_failed();
					toastService.addToast(msg, StatusColorEnum.ERROR);
				}
			} finally {
				deletingBranchId = null;
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">{m.branches()}</h1>
		<DaisyUiButton
			className="d-btn-primary"
			onClick={openCreate}
			loading={createLock.pending}
		>
			<LucidePlus />
			{m.new_branch()}
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if branches.length === 0 && !isLoading}
				<p class="py-8 text-center text-base-content/70">
					{m.no_branches_yet()}
				</p>
			{:else}
				<div class={TableEnum.HEIGHT}>
					<MariTable
						rows={branches}
						columns={branchColumns}
						{isLoading}
						bind:pageSize={pageSizeStr}
						bind:currentPage
						totalRowCount={total}
						showRefreshButton={true}
						refreshTooltip={m.refresh_data()}
						emptyMessage={m.no_branches_yet()}
						showRowActions={true}
						actionsHeader={m.actions()}
						actionsVariant="none"
						enableColumnFilters={true}
						useRemoteFilters={true}
						on:refresh={() => fetchBranches(true)}
						on:pageSizeChange={() => {
							currentPage = 1;
							fetchBranches(true);
						}}
						on:pageChange={() => fetchBranches(true)}
						on:filtersChange={(e) => {
							tableFilters = e.detail.filters;
							currentPage = 1;
							fetchBranches(true);
						}}
					>
						{#snippet rowActions(row, rowIndex)}
							{@const branch = row as StaffRegHospitalBranchRow}
							<td class="text-right">
								<div class="flex justify-end gap-2">
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										onClick={() => openEdit(branch)}
										loading={editingBranchId === branch.id}
										disabled={deletingBranchId === branch.id}
										loadingText=""
									>
										<LucidePencil />
									</DaisyUiButton>
									<DaisyUiButton
										className="d-btn-ghost d-btn-error d-btn-sm"
										onClick={() => handleDelete(branch)}
										loading={deletingBranchId === branch.id}
										disabled={deletingBranchId === branch.id}
										loadingText=""
									>
										<LucideTrash2 />
									</DaisyUiButton>
								</div>
							</td>
						{/snippet}
					</MariTable>
				</div>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
