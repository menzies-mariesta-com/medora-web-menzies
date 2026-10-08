<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { authClient } from '$lib/auth/client';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { toastSuccess } from '$lib/util/toast-copy.util';
	import { redirectIfTwoFactorRequired } from '$lib/util/two-factor-gate.util';
	import { AdminPageKeyEnum } from '$lib/model/enum/db-link';
	import {
		ADMIN_PAGE_KEYS_CLIENT,
		defaultAdminInvitePermissions
	} from '$lib/util/admin-permission.util';
	import type { AdminPagePermissionFlags } from '$lib/model/type/medora/admin-team.type';
	import { AdminTeamModalState } from '$lib/state/admin-team-modal.state.svelte';
	import {
		paraglideMessages,
		paraglideMsg
	} from '$lib/util/paraglide-msg.util';

	let { confirm, cancel }: DialogSlotProps = $props();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();
	const msg = paraglideMessages();

	const editing = $derived(AdminTeamModalState.member);
	const isEdit = $derived(!!editing);

	let name = $state('');
	let email = $state('');
	let permissions = $state<AdminPagePermissionFlags[]>(
		defaultAdminInvitePermissions()
	);
	let isSubmitting = $state(false);

	function syncFromState() {
		const member = AdminTeamModalState.member;
		if (member) {
			name = member.name ?? '';
			email = member.email ?? '';
			permissions = member.permissions?.length
				? structuredClone(member.permissions)
				: defaultAdminInvitePermissions();
		} else {
			name = '';
			email = '';
			permissions = defaultAdminInvitePermissions();
		}
	}

	$effect(() => {
		void AdminTeamModalState.member;
		syncFromState();
	});

	function pageLabel(pageKey: string): string {
		switch (pageKey) {
			case AdminPageKeyEnum.OVERVIEW:
				return paraglideMsg('admin_overview_title', 'Overview');
			case AdminPageKeyEnum.OWNERS:
				return paraglideMsg('admin_overview_owners', 'Owners');
			case AdminPageKeyEnum.HOSPITALS:
				return paraglideMsg('admin_overview_hospitals', 'Hospitals');
			case AdminPageKeyEnum.STAFF:
				return paraglideMsg('admin_overview_staff', 'Staff');
			case AdminPageKeyEnum.MONITORING:
				return paraglideMsg('admin_nav_monitoring', 'Monitoring');
			case AdminPageKeyEnum.ICD:
				return paraglideMsg('admin_nav_icd', 'ICD codes');
			case AdminPageKeyEnum.TEAM:
				return paraglideMsg('admin_nav_team', 'Team');
			default:
				return pageKey;
		}
	}

	function toggle(
		pageKey: string,
		field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete',
		checked: boolean
	) {
		permissions = permissions.map((p) => {
			if (p.pageKey !== pageKey) return p;
			const next = { ...p, [field]: checked };
			if (field === 'canView' && !checked) {
				next.canCreate = false;
				next.canEdit = false;
				next.canDelete = false;
			}
			if (
				field !== 'canView' &&
				checked &&
				!next.canView
			) {
				next.canView = true;
			}
			// Team page: invitees may only receive view (SYSTEM_ADMIN manages team)
			if (pageKey === AdminPageKeyEnum.TEAM && field !== 'canView') {
				next.canCreate = false;
				next.canEdit = false;
				next.canDelete = false;
			}
			return next;
		});
	}

	function ensureAllPages(): AdminPagePermissionFlags[] {
		const byKey = new Map(permissions.map((p) => [String(p.pageKey), p]));
		return ADMIN_PAGE_KEYS_CLIENT.map((pageKey) => {
			const existing = byKey.get(pageKey);
			if (existing) return existing;
			return {
				pageKey,
				canView: false,
				canCreate: false,
				canEdit: false,
				canDelete: false
			};
		});
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		const n = name.trim();
		const em = email.trim();
		if (!n) {
			toastService.addToast(
				msg.admin_team_name_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!isEdit && !em) {
			toastService.addToast(
				msg.admin_team_email_required(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const perms = ensureAllPages();
		if (!perms.some((p) => p.canView)) {
			toastService.addToast(
				msg.admin_team_need_view(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isSubmitting = true;
		try {
			if (isEdit && editing) {
				const res = await fetch(
					`/api/medora/admin/team/${editing.id}`,
					{
						method: 'PUT',
						headers: { 'content-type': 'application/json' },
						credentials: 'include',
						body: JSON.stringify({ name: n, permissions: perms })
					}
				);
				if (!res.ok) {
					if (await redirectIfTwoFactorRequired(res)) return;
					const t = await res.text().catch(() => '');
					throw new Error(t || `Update failed: ${res.status}`);
				}
				toastSuccess(
					toastService,
					msg.admin_team_member(),
					msg.toast_action_updated()
				);
			} else {
				const res = await fetch('/api/medora/admin/team', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						name: n,
						email: em,
						permissions: perms
					})
				});
				if (!res.ok) {
					if (await redirectIfTwoFactorRequired(res)) return;
					const t = await res.text().catch(() => '');
					throw new Error(t || `Invite failed: ${res.status}`);
				}
				toastSuccess(
					toastService,
					msg.admin_team_member(),
					msg.toast_action_created()
				);
				const { error } = await authClient.requestPasswordReset({
					email: em,
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
			}
			confirm();
		} catch (err) {
			const message =
				err instanceof Error ? err.message : msg.admin_team_save_failed();
			toastService.addToast(message, StatusColorEnum.ERROR);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex min-h-0 flex-1 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
		<div class="flex flex-col gap-4">
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="team-name" class="shrink-0 font-bold sm:w-36">
					{msg.name()}<span
						class="text-error align-top text-sm leading-none"
						aria-hidden="true">*</span
					>
				</label>
				<div class="max-w-80 flex-1">
					<WashInputField
						id="team-name"
						bind:value={name}
						inputType="text"
						inputPlaceholderText={msg.admin_team_name_placeholder()}
						required
					/>
				</div>
			</div>
			{#if !isEdit}
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<label for="team-email" class="shrink-0 font-bold sm:w-36">
						{msg.email()}<span
							class="text-error align-top text-sm leading-none"
							aria-hidden="true">*</span
						>
					</label>
					<div class="max-w-80 flex-1">
						<WashInputField
							id="team-email"
							bind:value={email}
							inputType="email"
							inputPlaceholderText="email@example.com"
							required
						/>
					</div>
				</div>
				<p class="text-sm text-base-content/70">
					{msg.admin_team_invite_hint()}
				</p>
			{:else}
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<span class="shrink-0 font-bold sm:w-36">{msg.email()}</span>
					<span class="text-sm text-base-content/80">{email}</span>
				</div>
			{/if}

			<div class="overflow-x-auto rounded-box border border-ink-border">
				<table class="table table-zebra table-sm">
					<thead>
						<tr>
							<th>{msg.admin_team_page()}</th>
							<th class="text-center">{msg.admin_perm_view()}</th>
							<th class="text-center">{msg.admin_perm_create()}</th>
							<th class="text-center">{msg.admin_perm_edit()}</th>
							<th class="text-center">{msg.admin_perm_delete()}</th>
						</tr>
					</thead>
					<tbody>
						{#each ensureAllPages() as row (row.pageKey)}
							{@const teamOnlyView =
								row.pageKey === AdminPageKeyEnum.TEAM}
							<tr>
								<td class="font-medium">{pageLabel(String(row.pageKey))}</td>
								<td class="text-center">
									<input
										type="checkbox"
										class="checkbox checkbox-sm cursor-pointer"
										checked={row.canView}
										onchange={(e) =>
											toggle(
												String(row.pageKey),
												'canView',
												(e.currentTarget as HTMLInputElement).checked
											)}
										aria-label={`${pageLabel(String(row.pageKey))} ${msg.admin_perm_view()}`}
									/>
								</td>
								<td class="text-center">
									<input
										type="checkbox"
										class="checkbox checkbox-sm cursor-pointer"
										class:cursor-not-allowed={teamOnlyView}
										checked={row.canCreate}
										disabled={teamOnlyView}
										onchange={(e) =>
											toggle(
												String(row.pageKey),
												'canCreate',
												(e.currentTarget as HTMLInputElement).checked
											)}
										aria-label={`${pageLabel(String(row.pageKey))} ${msg.admin_perm_create()}`}
									/>
								</td>
								<td class="text-center">
									<input
										type="checkbox"
										class="checkbox checkbox-sm cursor-pointer"
										class:cursor-not-allowed={teamOnlyView}
										checked={row.canEdit}
										disabled={teamOnlyView}
										onchange={(e) =>
											toggle(
												String(row.pageKey),
												'canEdit',
												(e.currentTarget as HTMLInputElement).checked
											)}
										aria-label={`${pageLabel(String(row.pageKey))} ${msg.admin_perm_edit()}`}
									/>
								</td>
								<td class="text-center">
									<input
										type="checkbox"
										class="checkbox checkbox-sm cursor-pointer"
										class:cursor-not-allowed={teamOnlyView}
										checked={row.canDelete}
										disabled={teamOnlyView}
										onchange={(e) =>
											toggle(
												String(row.pageKey),
												'canDelete',
												(e.currentTarget as HTMLInputElement).checked
											)}
										aria-label={`${pageLabel(String(row.pageKey))} ${msg.admin_perm_delete()}`}
									/>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if !isEdit}
				<p class="text-xs text-base-content/60">
					{msg.admin_team_matrix_hint()}
				</p>
			{/if}
		</div>
	</div>
	<WashDialogFooter className="gap-2">
		<WashButton
			type="button"
			className="btn-ghost"
			onClick={() => cancel()}
		>
			{msg.cancel()}
		</WashButton>
		<WashButton
			type="submit"
			className="btn-primary"
			loading={isSubmitting}
		>
			{isEdit ? msg.save() : msg.admin_team_invite()}
		</WashButton>
	</WashDialogFooter>
</form>
