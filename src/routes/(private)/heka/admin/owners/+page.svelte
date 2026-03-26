<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import {
		deleteUser,
		getUsersByRolePaginated
	} from '$lib/tool/remote/table/auth-table/user.http.tool.svelte';
	import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { UserSchema } from '$lib/server/db/schema-type';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import NewOwnerModal from '$lib/component/own/snippet/modal/NewOwnerModal.svelte';
	import EditOwnerModal from '$lib/component/own/snippet/modal/EditOwnerModal.svelte';
	import { EditOwnerModalState } from '$lib/state/edit-owner-modal.state.svelte';
	import { m } from '$lib/paraglide/messages';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let owners = $state<UserSchema[]>([]);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(true);
	let totalOwners = $state(0);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const ownerColumns: MariTableColumn<UserSchema>[] = [
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-64 min-w-[16rem]',
			field: 'name'
		},
		{
			id: 'email',
			header: m.email(),
			widthClass: 'w-72 min-w-[18rem]',
			field: 'email'
		},
		{
			id: 'createdAt',
			header: m.created(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) =>
				formatDate(value as string | null | undefined)
		},
		{
			id: 'status',
			header: m.status(),
			widthClass: 'w-32 min-w-[8rem]',
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
						: `${m.status()} ${row.statusId ?? m.unknown_label()}`
		}
	];

	async function loadOwners(forceRefresh = false) {
		// HTTP wrapper uses `cache: no-store`, so `forceRefresh` is implicit.
		void forceRefresh;
		isLoading = true;
		try {
			const pageSize = Number(pageSizeStr) || 10;
			const statusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const params = {
				roleId: RoleEnum.OWNER,
				page: currentPage,
				pageSize,
				name: tableFilters.name?.trim() || undefined,
				email: tableFilters.email?.trim() || undefined,
				statusId:
					statusId != null && Number.isFinite(statusId)
						? statusId
						: undefined
			};
			const result = await getUsersByRolePaginated(params);
			owners = result.data;
			totalOwners = result.total;
		} finally {
			isLoading = false;
		}
	}

	async function openNewOwnerModal() {
		const result = await dialogService.open({
			title: m.new_owner(),
			component: NewOwnerModal
		});
		if (result.confirmed) await loadOwners(true);
	}

	async function openEditOwnerModal(owner: UserSchema) {
		EditOwnerModalState.owner = owner;
		const result = await dialogService.open({
			title: m.edit_owner(),
			component: EditOwnerModal
		});
		if (result.confirmed) await loadOwners(true);
	}

	async function handleDelete(owner: UserSchema) {
		const result = await dialogService.open({
			title: m.delete_owner(),
			message: `${m.delete_owner_confirm_prefix()} "${
				owner.name ?? owner.email
			}"${m.delete_owner_confirm_suffix()}`,
			variant: DialogVariantEnum.CONFIRM
		});
		if (!result.confirmed) return;
		try {
			await deleteUser({ id: owner.id });
			toastService.addToast(
				m.owner_deleted(),
				StatusColorEnum.SUCCESS
			);
			await loadOwners(true);
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
			toastService.addToast(msg, StatusColorEnum.ERROR);
		}
	}

	function formatDate(s: string | null | undefined): string {
		if (!s) return '—';
		try {
			return new Date(s).toLocaleDateString();
		} catch {
			return '—';
		}
	}

	lifeCycleUtil.onMount(() => {
		loadOwners();
	});
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">{m.owner_management()}</h1>
		<DaisyUiButton
			className="d-btn-primary"
			onClick={openNewOwnerModal}
		>
			<LucidePlus />
			{m.new_owner()}
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if isLoading}
				<DaisyUiLoading className="py-8" />
			{:else if owners.length === 0}
				<p class="py-8 text-center text-base-content/70">
					{m.no_owners_yet()}
				</p>
			{:else}
				<div class={TableEnum.HEIGHT}>
					<MariTable
						rows={owners}
						columns={ownerColumns}
						{isLoading}
						bind:pageSize={pageSizeStr}
						bind:currentPage
						totalRowCount={totalOwners}
						showRefreshButton={false}
						emptyMessage={m.no_owners_yet()}
						showRowActions={true}
						actionsHeader={m.actions()}
						actionsVariant="none"
						enableColumnFilters={true}
						useRemoteFilters={true}
						on:pageSizeChange={() => {
							currentPage = 1;
							loadOwners();
						}}
						on:pageChange={() => loadOwners()}
						on:filtersChange={(event) => {
							if (filterDebounceTimeout) {
								clearTimeout(filterDebounceTimeout);
							}
							tableFilters = event.detail.filters;
							currentPage = 1;
							filterDebounceTimeout = setTimeout(() => {
								loadOwners();
							}, 350);
						}}
					>
						<svelte:fragment slot="rowActions" let:row>
							<td class="text-right">
								<div class="flex justify-end gap-2">
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										onClick={() => openEditOwnerModal(row)}
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
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
