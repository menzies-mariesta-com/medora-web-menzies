<script lang="ts">
	import { AdminPageKeyEnum, RoleEnum, StatusEnum } from '$lib/model/enum/db-link';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { UserListRow } from '$lib/model/type/medora/ui-rows.type';
	import type { AdminPagePermissionFlags } from '$lib/model/type/medora/admin-team.type';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideLink from '$lib/component/own/library/lucide/LucideLink.svelte';
	import NewOwnerModal from '$lib/component/own/snippet/modal/NewOwnerModal.svelte';
	import EditOwnerModal from '$lib/component/own/snippet/modal/EditOwnerModal.svelte';
	import NewHospitalModal from '$lib/component/own/snippet/modal/NewHospitalModal.svelte';
	import { EditOwnerModalState } from '$lib/state/edit-owner-modal.state.svelte';
	import { HospitalModalState } from '$lib/state/hospital-modal.state.svelte';
	import { m } from '$lib/paraglide/messages';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { page } from '$app/state';
	import {
		ensureTwoFactorForMutation,
		redirectIfTwoFactorRequired
	} from '$lib/util/two-factor-gate.util';
	import { adminPermissionAllows } from '$lib/util/admin-permission.util';
	let {
		onChanged
	}: {
		onChanged?: () => void | Promise<void>;
	} = $props();

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const msg = m as unknown as Record<string, (inputs?: object) => string>;

	const userRoleId = $derived(
		(page.data as { userRoleId?: number | null })?.userRoleId ?? null
	);
	const adminPermissions = $derived(
		(page.data as { adminPermissions?: AdminPagePermissionFlags[] | null })
			?.adminPermissions ?? null
	);
	const canCreateOwners = $derived(
		adminPermissionAllows(
			userRoleId,
			adminPermissions,
			AdminPageKeyEnum.OWNERS,
			'create'
		)
	);
	const canEditOwners = $derived(
		adminPermissionAllows(
			userRoleId,
			adminPermissions,
			AdminPageKeyEnum.OWNERS,
			'edit'
		)
	);
	const canDeleteOwners = $derived(
		adminPermissionAllows(
			userRoleId,
			adminPermissions,
			AdminPageKeyEnum.OWNERS,
			'delete'
		)
	);
	const canCreateHospitals = $derived(
		adminPermissionAllows(
			userRoleId,
			adminPermissions,
			AdminPageKeyEnum.HOSPITALS,
			'create'
		)
	);

	type OwnerUserRow = UserListRow & { statusId?: number | null };

	const createLock = createActionLock();
	const editLock = createActionLock();
	const deleteLock = createActionLock();
	const assignLock = createActionLock();

	let editingOwnerId = $state<string | null>(null);
	let deletingOwnerId = $state<string | null>(null);
	let assigningOwnerId = $state<string | null>(null);

	let owners = $state<OwnerUserRow[]>([]);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(true);
	let totalOwners = $state(0);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const ownerColumns: MenziesTableColumn<OwnerUserRow>[] = [
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

	async function notifyChanged() {
		if (onChanged) await onChanged();
	}

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
			const res = await fetch(
				`/api/medora/auth/user?${qs.toString()}`,
				{
					credentials: 'include',
					cache: 'no-store'
				}
			);
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

	async function requireAdminTwoFactor(): Promise<boolean> {
		return ensureTwoFactorForMutation({
			userRoleId: RoleEnum.SYSTEM_ADMIN,
			twoFactorEnabled: Boolean(
				(page.data as { twoFactorEnabled?: boolean } | undefined)
					?.twoFactorEnabled
			)
		});
	}

	async function openNewOwnerModal() {
		await createLock.run(async () => {
			if (!(await requireAdminTwoFactor())) return;
			const result = await dialogService.open({
				title: m.new_owner(),
				component: NewOwnerModal
			});
			if (result.confirmed) {
				await loadOwners(true);
				await notifyChanged();
			}
		});
	}

	async function openEditOwnerModal(owner: OwnerUserRow) {
		await editLock.run(async () => {
			if (!(await requireAdminTwoFactor())) return;
			editingOwnerId = owner.id;
			try {
				EditOwnerModalState.owner = owner;
				const result = await dialogService.open({
					title: m.edit_owner(),
					component: EditOwnerModal
				});
				if (result.confirmed) {
					await loadOwners(true);
					await notifyChanged();
				}
			} finally {
				editingOwnerId = null;
			}
		});
	}

	async function openAssignHospital(owner: OwnerUserRow) {
		await assignLock.run(async () => {
			if (!(await requireAdminTwoFactor())) return;
			assigningOwnerId = owner.id;
			try {
				HospitalModalState.hospitalId = null;
				HospitalModalState.currentUserRoleId = RoleEnum.SYSTEM_ADMIN;
				HospitalModalState.currentUserId = page.data?.user
					? (page.data.user as { id?: string }).id
					: undefined;
				HospitalModalState.preselectedOwnerId = owner.id;
				const result = await dialogService.open({
					title: m.new_hospital(),
					component: NewHospitalModal
				});
				if (result.confirmed) {
					await notifyChanged();
				}
			} finally {
				assigningOwnerId = null;
				HospitalModalState.preselectedOwnerId = null;
			}
		});
	}

	async function handleDelete(owner: OwnerUserRow) {
		await deleteLock.run(async () => {
			if (!(await requireAdminTwoFactor())) return;
			deletingOwnerId = owner.id;
			try {
				const result = await dialogService.open({
					title: m.delete_owner(),
					message: `${m.delete_owner_confirm_prefix()}="${
						owner.name ?? owner.email
					}"${m.delete_owner_confirm_suffix()}`,
					variant: DialogVariantEnum.CONFIRM
				});
				if (!result.confirmed) return;
				try {
					const res = await fetch(
						`/api/medora/auth/user?id=${encodeURIComponent(owner.id)}`,
						{ method: 'DELETE', credentials: 'include' }
					);
					if (!res.ok) {
						if (await redirectIfTwoFactorRequired(res)) return;
						const t = await res.text().catch(() => '');
						throw new Error(t || `Delete failed: ${res.status}`);
					}
					toastService.addToast(
						m.owner_deleted(),
						StatusColorEnum.SUCCESS
					);
					await loadOwners(true);
					await notifyChanged();
				} catch (err) {
					const errMsg =
						err instanceof Error ? err.message : m.delete_failed();
					toastService.addToast(errMsg, StatusColorEnum.ERROR);
				}
			} finally {
				deletingOwnerId = null;
			}
		});
	}

	function formatDate(s: string | null | undefined): string {
		if (!s) return '-';
		try {
			return new Date(s).toLocaleDateString();
		} catch {
			return '-';
		}
	}

	lifeCycleUtil.onMount(() => {
		loadOwners();
	});
</script>

<div class="{TableEnum.HEIGHT} min-h-[24rem]">
	<MenziesTable
		title={m.owner_management()}
		showAddButton={canCreateOwners}
		addLabel={m.new_owner()}
		addDisabled={!canCreateOwners ||
			createLock.pending ||
			editLock.pending ||
			deleteLock.pending ||
			assignLock.pending}
		onAdd={openNewOwnerModal}
		rows={owners}
		columns={ownerColumns}
		{isLoading}
		bind:pageSize={pageSizeStr}
		bind:currentPage
		totalRowCount={totalOwners}
		showRefreshButton={false}
		emptyMessage={m.no_owners_yet()}
		showRowActions={canCreateHospitals || canEditOwners || canDeleteOwners}
		actionsHeader={m.actions()}
		actionsVariant="none"
		enableColumnFilters={true}
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
		{#snippet rowActions(row)}
			{@const ownerRow = row as OwnerUserRow}
			<MenziesTableRowActionGroup>
				{#if canCreateHospitals}
					<MenziesTableIconAction
						tooltipText={msg.admin_assign_hospital()}
						color="primary"
						loading={assigningOwnerId === ownerRow.id}
						disabled={createLock.pending ||
							editLock.pending ||
							deleteLock.pending ||
							(assignLock.pending && assigningOwnerId !== ownerRow.id)}
						loadingText=""
						onClick={() => openAssignHospital(ownerRow)}
					>
						{#snippet icon()}
							<LucideLink className="size-4" />
						{/snippet}
					</MenziesTableIconAction>
				{/if}
				{#if canEditOwners}
					<MenziesTableIconAction
						tooltipText={m.menzies_table_tooltip_edit()}
						color="accent"
						loading={editingOwnerId === ownerRow.id}
						disabled={createLock.pending ||
							deleteLock.pending ||
							assignLock.pending ||
							(editLock.pending && editingOwnerId !== ownerRow.id)}
						loadingText=""
						onClick={() => openEditOwnerModal(ownerRow)}
					>
						{#snippet icon()}
							<LucidePencil className="size-4" />
						{/snippet}
					</MenziesTableIconAction>
				{/if}
				{#if canDeleteOwners}
					<MenziesTableIconAction
						tooltipText={m.menzies_table_tooltip_delete()}
						color="error"
						loading={deletingOwnerId === ownerRow.id}
						disabled={createLock.pending ||
							editLock.pending ||
							assignLock.pending ||
							(deleteLock.pending && deletingOwnerId !== ownerRow.id)}
						loadingText=""
						onClick={() => handleDelete(ownerRow)}
					>
						{#snippet icon()}
							<LucideTrash2 className="size-4" />
						{/snippet}
					</MenziesTableIconAction>
				{/if}
			</MenziesTableRowActionGroup>
		{/snippet}
	</MenziesTable>
</div>
