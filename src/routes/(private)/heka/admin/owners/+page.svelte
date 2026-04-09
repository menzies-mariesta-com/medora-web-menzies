<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import { RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { UserListRow } from '$lib/model/type/heka/ui-rows.type';
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

	type OwnerUserRow = UserListRow & { statusId?: number | null };

	const createLock = createActionLock();
	const editLock = createActionLock();
	const deleteLock = createActionLock();

	let editingOwnerId = $state<string | null>(null);
	let deletingOwnerId = $state<string | null>(null);

	let owners = $state<OwnerUserRow[]>([]);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(true);
	let totalOwners = $state(0);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const ownerColumns: MariTableColumn<OwnerUserRow>[] = [
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

	async function loadOwners(_forceRefresh = false) {
		isLoading = true;
		try {
			const pageSize = Number(pageSizeStr) || 10;
			const statusId = tableFilters.status
				? Number(tableFilters.status)
				: undefined;
			const qs = new URLSearchParams();
			qs.set('roleId', String(RoleEnum.OWNER));
			qs.set('page', String(currentPage));
			qs.set('pageSize', String(pageSize));
			const name = tableFilters.name?.trim();
			const email = tableFilters.email?.trim();
			if (name) qs.set('name', name);
			if (email) qs.set('email', email);
			if (statusId != null && Number.isFinite(statusId)) {
				qs.set('statusId', String(statusId));
			}
			const res = await fetch(`/api/heka/auth/user?${qs.toString()}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Load failed: ${res.status}`);
			}
			const result = (await res.json()) as {
				data: OwnerUserRow[];
				total: number;
			};
			owners = result.data;
			totalOwners = result.total;
		} finally {
			isLoading = false;
		}
	}

	async function openNewOwnerModal() {
		await createLock.run(async () => {
			const result = await dialogService.open({
				title: m.new_owner(),
				component: NewOwnerModal
			});
			if (result.confirmed) await loadOwners(true);
		});
	}

	async function openEditOwnerModal(owner: OwnerUserRow) {
		await editLock.run(async () => {
			editingOwnerId = owner.id;
			try {
				EditOwnerModalState.owner = owner;
				const result = await dialogService.open({
					title: m.edit_owner(),
					component: EditOwnerModal
				});
				if (result.confirmed) await loadOwners(true);
			} finally {
				editingOwnerId = null;
			}
		});
	}

	async function handleDelete(owner: OwnerUserRow) {
		await deleteLock.run(async () => {
			deletingOwnerId = owner.id;
			try {
				const result = await dialogService.open({
					title: m.delete_owner(),
					message: `${m.delete_owner_confirm_prefix()} "${
						owner.name ?? owner.email
					}"${m.delete_owner_confirm_suffix()}`,
					variant: DialogVariantEnum.CONFIRM
				});
				if (!result.confirmed) return;
				try {
					const res = await fetch(
						`/api/heka/auth/user?id=${encodeURIComponent(owner.id)}`,
						{ method: 'DELETE', credentials: 'include' }
					);
					if (!res.ok) {
						const t = await res.text().catch(() => '');
						throw new Error(t || `Delete failed: ${res.status}`);
					}
					toastService.addToast(
						m.owner_deleted(),
						StatusColorEnum.SUCCESS
					);
					await loadOwners(true);
				} catch (err) {
					const msg =
						err instanceof Error
							? err.message
							: m.delete_failed();
					toastService.addToast(msg, StatusColorEnum.ERROR);
				}
			} finally {
				deletingOwnerId = null;
			}
		});
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
			loading={createLock.pending}
			disabled={editLock.pending || deleteLock.pending}
		>
			<LucidePlus />
			{m.new_owner()}
		</DaisyUiButton>
	</div>

	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if owners.length === 0 && !isLoading}
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
						{#snippet rowActions(row, rowIndex)}
							{@const ownerRow = row as UserListRow}
							<td class="text-right">
								<div class="flex justify-end gap-2">
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										onClick={() =>
											openEditOwnerModal(ownerRow)}
										loading={editingOwnerId === ownerRow.id}
										disabled={
											createLock.pending ||
											deleteLock.pending ||
											(editLock.pending &&
												editingOwnerId !== ownerRow.id)
										}
										loadingText=""
									>
										<LucidePencil />
									</DaisyUiButton>
									<DaisyUiButton
										className="d-btn-ghost d-btn-error d-btn-sm"
										onClick={() =>
											handleDelete(ownerRow)}
										loading={
											deletingOwnerId === ownerRow.id
										}
										disabled={
											createLock.pending ||
											editLock.pending ||
											(deleteLock.pending &&
												deletingOwnerId !==
													ownerRow.id)
										}
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
