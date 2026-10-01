<script lang="ts">
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideMail from '$lib/component/own/library/lucide/LucideMail.svelte';
	import AdminTeamMemberModal from '$lib/component/own/snippet/modal/AdminTeamMemberModal.svelte';
	import { AdminTeamModalState } from '$lib/state/admin-team-modal.state.svelte';
	import { m } from '$lib/paraglide/messages';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { page } from '$app/state';
	import { RoleEnum } from '$lib/model/enum/db-link';
	import type { AdminTeamMember } from '$lib/model/type/medora/admin-team.type';
	import {
		ensureTwoFactorForMutation,
		redirectIfTwoFactorRequired
	} from '$lib/util/two-factor-gate.util';
	import { authClient } from '$lib/auth/client';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();
	const msg = m as unknown as Record<string, (inputs?: object) => string>;

	const createLock = createActionLock();
	const editLock = createActionLock();
	const deleteLock = createActionLock();
	const resendLock = createActionLock();

	let editingId = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let resendingId = $state<string | null>(null);

	let members = $state<AdminTeamMember[]>([]);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let isLoading = $state(true);
	let totalMembers = $state(0);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;

	const isSystemAdmin = $derived(
		(page.data as { isSystemAdmin?: boolean; userRoleId?: number })
			?.isSystemAdmin === true ||
			(page.data as { userRoleId?: number })?.userRoleId ===
				RoleEnum.SYSTEM_ADMIN
	);

	const columns: MenziesTableColumn<AdminTeamMember>[] = [
		{
			id: 'name',
			header: m.name(),
			widthClass: 'w-56 min-w-[14rem]',
			field: 'name'
		},
		{
			id: 'email',
			header: m.email(),
			widthClass: 'w-72 min-w-[18rem]',
			field: 'email'
		},
		{
			id: 'permissions',
			header: msg.admin_team_permissions_summary(),
			widthClass: 'w-80 min-w-[20rem]',
			filterable: false,
			format: (_value, row) => summarizePermissions(row)
		},
		{
			id: 'createdAt',
			header: m.created(),
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) =>
				formatDate(value as string | null | undefined)
		}
	];

	function summarizePermissions(row: AdminTeamMember): string {
		const views = (row.permissions ?? [])
			.filter((p) => p.canView)
			.map((p) => String(p.pageKey));
		return views.length ? views.join(', ') : '-';
	}

	function formatDate(s: string | null | undefined): string {
		if (!s) return '-';
		try {
			return new Date(s).toLocaleDateString();
		} catch {
			return '-';
		}
	}

	async function loadMembers() {
		isLoading = true;
		try {
			const pageSize = Number(pageSizeStr) || 10;
			const qs = new URLSearchParams();
			qs.set('page', String(currentPage));
			qs.set('pageSize', String(pageSize));
			const name = tableFilters.name?.trim();
			const email = tableFilters.email?.trim();
			if (name) qs.set('name', name);
			if (email) qs.set('email', email);
			const res = await fetch(
				`/api/medora/admin/team?${qs.toString()}`,
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
				data: AdminTeamMember[];
				total: number;
			};
			members = result.data;
			totalMembers = result.total;
		} finally {
			isLoading = false;
		}
	}

	async function requireAdminTwoFactor(): Promise<boolean> {
		const data = page.data as {
			userRoleId?: number;
			twoFactorEnabled?: boolean;
		};
		return ensureTwoFactorForMutation({
			userRoleId: data.userRoleId ?? RoleEnum.SYSTEM_ADMIN,
			twoFactorEnabled: Boolean(data.twoFactorEnabled)
		});
	}

	async function openInviteModal() {
		await createLock.run(async () => {
			if (!(await requireAdminTwoFactor())) return;
			AdminTeamModalState.member = null;
			const result = await dialogService.open({
				title: msg.admin_team_invite_title(),
				component: AdminTeamMemberModal
			});
			if (result.confirmed) await loadMembers();
		});
	}

	async function openEditModal(member: AdminTeamMember) {
		await editLock.run(async () => {
			if (!(await requireAdminTwoFactor())) return;
			editingId = member.id;
			try {
				AdminTeamModalState.member = member;
				const result = await dialogService.open({
					title: msg.admin_team_edit_title(),
					component: AdminTeamMemberModal
				});
				if (result.confirmed) await loadMembers();
			} finally {
				editingId = null;
				AdminTeamModalState.member = null;
			}
		});
	}

	async function resendReset(member: AdminTeamMember) {
		await resendLock.run(async () => {
			if (!(await requireAdminTwoFactor())) return;
			resendingId = member.id;
			try {
				const { error } = await authClient.requestPasswordReset({
					email: member.email,
					redirectTo: routerUtil.getResetRedirectUrl()
				});
				if (error) {
					toastService.addToast(
						error.message ?? msg.admin_team_reset_failed(),
						StatusColorEnum.ERROR
					);
				} else {
					toastService.addToast(
						msg.admin_team_reset_sent(),
						StatusColorEnum.INFO
					);
				}
			} finally {
				resendingId = null;
			}
		});
	}

	async function revokeMember(member: AdminTeamMember) {
		await deleteLock.run(async () => {
			if (!(await requireAdminTwoFactor())) return;
			deletingId = member.id;
			try {
				const result = await dialogService.open({
					title: msg.admin_team_revoke_title(),
					message: `${msg.admin_team_revoke_confirm_prefix()}="${member.name}"${msg.admin_team_revoke_confirm_suffix()}`,
					variant: DialogVariantEnum.CONFIRM
				});
				if (!result.confirmed) return;
				const res = await fetch(
					`/api/medora/admin/team/${member.id}`,
					{
						method: 'DELETE',
						credentials: 'include'
					}
				);
				if (!res.ok) {
					if (await redirectIfTwoFactorRequired(res)) return;
					const t = await res.text().catch(() => '');
					throw new Error(t || `Revoke failed: ${res.status}`);
				}
				toastService.addToast(
					msg.admin_team_revoked(),
					StatusColorEnum.SUCCESS
				);
				await loadMembers();
			} catch (err) {
				const errMsg =
					err instanceof Error
						? err.message
						: msg.admin_team_revoke_failed();
				toastService.addToast(errMsg, StatusColorEnum.ERROR);
			} finally {
				deletingId = null;
			}
		});
	}

	lifeCycleUtil.onMount(() => {
		loadMembers();
	});
</script>

<div class="{TableEnum.HEIGHT} min-h-[24rem]">
	<MenziesTable
		title={msg.admin_team_title()}
		showAddButton={isSystemAdmin}
		addLabel={msg.admin_team_invite()}
		addDisabled={!isSystemAdmin ||
			createLock.pending ||
			editLock.pending ||
			deleteLock.pending ||
			resendLock.pending}
		onAdd={openInviteModal}
		rows={members}
		{columns}
		{isLoading}
		bind:pageSize={pageSizeStr}
		bind:currentPage
		totalRowCount={totalMembers}
		showRefreshButton={false}
		emptyMessage={msg.admin_team_empty()}
		showRowActions={isSystemAdmin}
		actionsHeader={m.actions()}
		actionsVariant="none"
		enableColumnFilters={true}
		on:pageSizeChange={() => {
			currentPage = 1;
			loadMembers();
		}}
		on:pageChange={() => loadMembers()}
		on:filtersChange={(event) => {
			if (filterDebounceTimeout) {
				clearTimeout(filterDebounceTimeout);
			}
			tableFilters = event.detail.filters;
			currentPage = 1;
			filterDebounceTimeout = setTimeout(() => {
				loadMembers();
			}, 350);
		}}
	>
		{#snippet rowActions(row)}
			{@const member = row as AdminTeamMember}
			<MenziesTableRowActionGroup>
				<MenziesTableIconAction
					tooltipText={msg.admin_team_resend_reset()}
					color="secondary"
					loading={resendingId === member.id}
					disabled={createLock.pending ||
						editLock.pending ||
						deleteLock.pending ||
						(resendLock.pending && resendingId !== member.id)}
					loadingText=""
					onClick={() => resendReset(member)}
				>
					{#snippet icon()}
						<LucideMail className="size-4" />
					{/snippet}
				</MenziesTableIconAction>
				<MenziesTableIconAction
					tooltipText={m.menzies_table_tooltip_edit()}
					color="accent"
					loading={editingId === member.id}
					disabled={createLock.pending ||
						deleteLock.pending ||
						resendLock.pending ||
						(editLock.pending && editingId !== member.id)}
					loadingText=""
					onClick={() => openEditModal(member)}
				>
					{#snippet icon()}
						<LucidePencil className="size-4" />
					{/snippet}
				</MenziesTableIconAction>
				<MenziesTableIconAction
					tooltipText={msg.admin_team_revoke()}
					color="error"
					loading={deletingId === member.id}
					disabled={createLock.pending ||
						editLock.pending ||
						resendLock.pending ||
						(deleteLock.pending && deletingId !== member.id)}
					loadingText=""
					onClick={() => revokeMember(member)}
				>
					{#snippet icon()}
						<LucideTrash2 className="size-4" />
					{/snippet}
				</MenziesTableIconAction>
			</MenziesTableRowActionGroup>
		{/snippet}
	</MenziesTable>
</div>
