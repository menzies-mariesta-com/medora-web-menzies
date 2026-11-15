<script lang="ts">
	import { AdminPageKeyEnum } from '$lib/model/enum/db-link';
	import {
		OwnerEntitlementPhaseEnum,
		PlanRequestKindEnum
	} from '$lib/model/enum/plan.enum';
	import type {
		OwnerPlanListRow,
		PlanRequestListRow
	} from '$lib/model/type/plan/owner-entitlement.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import GrantPlanRequestModal from '$lib/component/own/snippet/modal/GrantPlanRequestModal.svelte';
	import { page } from '$app/state';
	import { adminPermissionAllows } from '$lib/util/admin-permission.util';
	import { formatMenziesTableDateTime } from '$lib/util/menzies-table-datetime.util';
	import { redirectIfTwoFactorRequired } from '$lib/util/two-factor-gate.util';
	import { invalidateClientFetchCache } from '$lib/util/client-fetch-cache.util';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import LucideCheck from '$lib/component/own/library/lucide/LucideCheck.svelte';
	import LucideBan from '$lib/component/own/library/lucide/LucideBan.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideUserX from '$lib/component/own/library/lucide/LucideUserX.svelte';
	import LucideMail from '$lib/component/own/library/lucide/LucideMail.svelte';
	import { m } from '$lib/paraglide/messages';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const msg = m as Record<string, (inputs?: object) => string>;

	const userRoleId = $derived(
		(page.data as { userRoleId?: number | null })?.userRoleId ?? null
	);
	const adminPermissions = $derived(
		(page.data as { adminPermissions?: import('$lib/model/type/medora/admin-team.type').AdminPagePermissionFlags[] | null })
			?.adminPermissions ?? null
	);
	const canGrant = $derived(
		adminPermissionAllows(
			userRoleId,
			adminPermissions,
			AdminPageKeyEnum.PLANS,
			'create'
		)
	);
	const canEdit = $derived(
		adminPermissionAllows(
			userRoleId,
			adminPermissions,
			AdminPageKeyEnum.PLANS,
			'edit'
		)
	);
	const canDelete = $derived(
		adminPermissionAllows(
			userRoleId,
			adminPermissions,
			AdminPageKeyEnum.PLANS,
			'delete'
		)
	);

	let pending = $state<PlanRequestListRow[]>([]);
	let active = $state<OwnerPlanListRow[]>([]);
	let loading = $state(true);
	let tab = $state<'pending' | 'active'>(
		page.url.searchParams.get('tab') === 'active' ? 'active' : 'pending'
	);

	function trialDurationLabel(duration: string | null): string {
		if (!duration) return '—';
		if (duration === '7d') return '7 days';
		if (duration === '14d') return '2 weeks';
		if (duration === '30d') return '1 month';
		return duration;
	}

	function pendingPlanLabel(row: PlanRequestListRow): string {
		if (row.requestKind === PlanRequestKindEnum.PAID) {
			return row.pricingTier ?? '—';
		}
		return trialDurationLabel(row.trialDuration);
	}

	async function readApiError(res: Response): Promise<string> {
		try {
			const body = (await res.json()) as { message?: string };
			if (body?.message) return body.message;
		} catch {
			// non-JSON body
		}
		return `Request failed (${res.status})`;
	}

	async function load() {
		loading = true;
		try {
			const res = await fetch('/api/medora/admin/plans', {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) throw new Error(String(res.status));
			const data = (await res.json()) as {
				pending: PlanRequestListRow[];
				active: OwnerPlanListRow[];
			};
			pending = data.pending;
			active = data.active;
		} catch {
			toastService.addToast('Failed to load plans.', StatusColorEnum.ERROR);
		} finally {
			loading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		void load();
	});

	function rowClass(row: OwnerPlanListRow): string {
		if (row.phase === OwnerEntitlementPhaseEnum.GRACE) {
			return 'bg-warning/15';
		}
		if (
			row.phase === OwnerEntitlementPhaseEnum.READ_ONLY ||
			row.status === 'suspended' ||
			row.status === 'revoked'
		) {
			return 'bg-error/10';
		}
		return '';
	}

	async function postRequest(
		action: string,
		requestId: string
	): Promise<boolean> {
		const res = await fetch('/api/medora/admin/plans/request', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ action, requestId })
		});
		if (!res.ok) {
			if (await redirectIfTwoFactorRequired(res)) return false;
			toastService.addToast(await readApiError(res), StatusColorEnum.ERROR);
			return false;
		}
		invalidateClientFetchCache('/api/medora/admin/plans');
		return true;
	}

	async function postEntitlement(
		action: string,
		entitlementId: string
	): Promise<boolean> {
		const res = await fetch('/api/medora/admin/plans/entitlement', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ action, entitlementId })
		});
		if (!res.ok) {
			if (await redirectIfTwoFactorRequired(res)) return false;
			toastService.addToast(await readApiError(res), StatusColorEnum.ERROR);
			return false;
		}
		invalidateClientFetchCache('/api/medora/admin/plans');
		return true;
	}

	async function openGrant(row: PlanRequestListRow) {
		const result = await dialogService.open({
			title: 'Grant plan',
			component: GrantPlanRequestModal,
			props: { request: row }
		});
		if (result.confirmed) await load();
	}
</script>

<div class="tabs tabs-bordered mb-4">
	<button
		type="button"
		class="tab"
		class:tab-active={tab === 'pending'}
		onclick={() => (tab = 'pending')}
	>
		Pending ({pending.length})
	</button>
	<button
		type="button"
		class="tab"
		class:tab-active={tab === 'active'}
		onclick={() => (tab = 'active')}
	>
		Active plans ({active.length})
	</button>
</div>

{#if loading}
	<div class="flex justify-center py-12">
		<span class="loading loading-spinner loading-md text-primary"></span>
	</div>
{:else if tab === 'pending'}
	<div class="overflow-x-auto rounded-box border border-base-300">
		<table class="table table-zebra">
			<thead>
				<tr>
					<th class="w-36">{m.actions()}</th>
					<th>Name</th>
					<th>Email</th>
					<th>Hospital</th>
					<th>Kind</th>
					<th>Plan</th>
					<th>Submitted</th>
				</tr>
			</thead>
			<tbody>
				{#each pending as row (row.id)}
					<tr>
						<td>
							<MenziesTableRowActionGroup>
								{#if canGrant}
									<MenziesTableIconAction
										tooltipText="Grant"
										color="primary"
										onClick={() => openGrant(row)}
									>
										{#snippet icon()}
											<LucideCheck className="size-4" />
										{/snippet}
									</MenziesTableIconAction>
								{/if}
								{#if canEdit}
									<MenziesTableIconAction
										tooltipText="Ignore"
										color="warning"
										onClick={async () => {
											if (await postRequest('ignore', row.id)) {
												toastService.addToast(
													'Request ignored.',
													StatusColorEnum.INFO
												);
												await load();
											}
										}}
									>
										{#snippet icon()}
											<LucideBan className="size-4" />
										{/snippet}
									</MenziesTableIconAction>
								{/if}
								{#if canDelete}
									<MenziesTableIconAction
										tooltipText={msg.menzies_table_tooltip_delete()}
										color="error"
										onClick={async () => {
											if (await postRequest('remove', row.id)) {
												await load();
											}
										}}
									>
										{#snippet icon()}
											<LucideTrash2 className="size-4" />
										{/snippet}
									</MenziesTableIconAction>
								{/if}
							</MenziesTableRowActionGroup>
						</td>
						<td>{row.firstName} {row.lastName}</td>
						<td>{row.email}</td>
						<td>{row.hospitalName}</td>
						<td class="capitalize">{row.requestKind}</td>
						<td class="capitalize">{pendingPlanLabel(row)}</td>
						<td>{formatMenziesTableDateTime(row.createdAt)}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="text-center text-base-content/60">
							No pending requests.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class="overflow-x-auto rounded-box border border-base-300">
		<table class="table table-zebra">
			<thead>
				<tr>
					<th class="w-36">{m.actions()}</th>
					<th>Owner</th>
					<th>Hospitals</th>
					<th>Plan</th>
					<th>Mode</th>
					<th>Started</th>
					<th>Renew / end</th>
					<th>Status</th>
					<th>Phase</th>
				</tr>
			</thead>
			<tbody>
				{#each active as row (row.entitlementId)}
					<tr class={rowClass(row)}>
						<td>
							<MenziesTableRowActionGroup>
								{#if canEdit}
									<MenziesTableIconAction
										tooltipText="Send password reset email"
										color="info"
										onClick={async () => {
											if (
												await postEntitlement(
													'send_password_reset',
													row.entitlementId
												)
											) {
												toastService.addToast(
													'Password reset email sent.',
													StatusColorEnum.SUCCESS
												);
											}
										}}
									>
										{#snippet icon()}
											<LucideMail className="size-4" />
										{/snippet}
									</MenziesTableIconAction>
									<MenziesTableIconAction
										tooltipText="Suspend"
										color="warning"
										onClick={async () => {
											if (
												await postEntitlement(
													'suspend',
													row.entitlementId
												)
											) {
												toastService.addToast(
													'Plan suspended.',
													StatusColorEnum.INFO
												);
												await load();
											}
										}}
									>
										{#snippet icon()}
											<LucideBan className="size-4" />
										{/snippet}
									</MenziesTableIconAction>
									<MenziesTableIconAction
										tooltipText="Revoke"
										color="accent"
										onClick={async () => {
											if (
												await postEntitlement(
													'revoke',
													row.entitlementId
												)
											) {
												toastService.addToast(
													'Plan revoked.',
													StatusColorEnum.INFO
												);
												await load();
											}
										}}
									>
										{#snippet icon()}
											<LucideUserX className="size-4" />
										{/snippet}
									</MenziesTableIconAction>
								{/if}
								{#if canDelete}
									<MenziesTableIconAction
										tooltipText={msg.menzies_table_tooltip_delete()}
										color="error"
										onClick={async () => {
											const confirm = await dialogService.open({
												title: 'Remove owner plan',
												message: `Delete ${row.ownerEmail ?? 'this owner'}'s account, entitlements, and plan requests so they can sign up again. Hospitals stay in the system with no owner.`,
												variant: DialogVariantEnum.CONFIRM
											});
											if (!confirm.confirmed) return;
											if (
												await postEntitlement(
													'remove',
													row.entitlementId
												)
											) {
												toastService.addToast(
													'Owner plan removed.',
													StatusColorEnum.INFO
												);
												await load();
											}
										}}
									>
										{#snippet icon()}
											<LucideTrash2 className="size-4" />
										{/snippet}
									</MenziesTableIconAction>
								{/if}
							</MenziesTableRowActionGroup>
						</td>
						<td>
							<div class="font-medium">{row.ownerName ?? '—'}</div>
							<div class="text-xs text-base-content/60">{row.ownerEmail}</div>
						</td>
						<td class="max-w-xs truncate" title={row.hospitalNames.join(', ')}>
							{row.hospitalNames.join(', ') || '—'}
						</td>
						<td class="capitalize">
							{row.billingMode === 'trial'
								? trialDurationLabel(row.trialDuration)
								: row.pricingTier}
						</td>
						<td class="capitalize">{row.billingMode}</td>
						<td>{formatMenziesTableDateTime(row.startedAt)}</td>
						<td>
							{formatMenziesTableDateTime(row.renewAt ?? row.endsAt, '—')}
						</td>
						<td class="capitalize">{row.status}</td>
						<td>{row.phase}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="9" class="text-center text-base-content/60">
							No active owner plans.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
