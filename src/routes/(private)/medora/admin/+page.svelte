<script lang="ts">
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import type { AdminSummary } from '$lib/model/type/medora/admin-summary.type';
	import type {
		AdminOpsActivityItem,
		AdminOpsPayload
	} from '$lib/model/type/medora/admin-ops.type';
	import type { AdminPagePermissionFlags } from '$lib/model/type/medora/admin-team.type';
	import LucideUserCog from '$lib/component/own/library/lucide/LucideUserCog.svelte';
	import LucideHouse from '$lib/component/own/library/lucide/LucideHouse.svelte';
	import LucideUsersRound from '$lib/component/own/library/lucide/LucideUsersRound.svelte';
	import LucideActivity from '$lib/component/own/library/lucide/LucideActivity.svelte';
	import { AdminPageKeyEnum } from '$lib/model/enum/db-link';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { adminPermissionAllows } from '$lib/util/admin-permission.util';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';

	const lifeCycleUtil = new LifeCycleUtil();
	const datetimeUtil = new DateTimeUtil();
	const msg = m as unknown as Record<string, (inputs?: object) => string>;

	const userRoleId = $derived(
		(page.data as { userRoleId?: number | null })?.userRoleId ?? null
	);
	const adminPermissions = $derived(
		(page.data as { adminPermissions?: AdminPagePermissionFlags[] | null })
			?.adminPermissions ?? null
	);

	const canViewOwners = $derived(
		adminPermissionAllows(
			userRoleId,
			adminPermissions,
			AdminPageKeyEnum.OWNERS,
			'view'
		)
	);
	const canViewHospitals = $derived(
		adminPermissionAllows(
			userRoleId,
			adminPermissions,
			AdminPageKeyEnum.HOSPITALS,
			'view'
		)
	);
	const canViewStaff = $derived(
		adminPermissionAllows(
			userRoleId,
			adminPermissions,
			AdminPageKeyEnum.STAFF,
			'view'
		)
	);
	const canViewMonitoring = $derived(
		adminPermissionAllows(
			userRoleId,
			adminPermissions,
			AdminPageKeyEnum.MONITORING,
			'view'
		)
	);

	let summary = $state<AdminSummary | null>(null);
	let summaryLoading = $state(true);
	let activity = $state<AdminOpsActivityItem[]>([]);
	let activityLoading = $state(true);

	function activityLabel(kind: AdminOpsActivityItem['kind']): string {
		switch (kind) {
			case 'login':
				return msg.admin_ops_activity_login();
			case 'owner_created':
				return msg.admin_ops_activity_owner();
			case 'hospital_created':
				return msg.admin_ops_activity_hospital();
			case 'staff_created':
				return msg.admin_ops_activity_staff();
			default:
				return kind;
		}
	}

	function formatShort(value: string | null | undefined): string {
		const date = datetimeUtil.parseAnyToDate(value);
		if (!date) return '-';
		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function loadSummary() {
		summaryLoading = true;
		try {
			const res = await fetch('/api/medora/admin/summary', {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) {
				summary = null;
				return;
			}
			summary = (await res.json()) as AdminSummary;
		} finally {
			summaryLoading = false;
		}
	}

	async function loadActivityTeaser() {
		const roleId =
			(page.data as { userRoleId?: number | null })?.userRoleId ?? null;
		const perms =
			(page.data as { adminPermissions?: AdminPagePermissionFlags[] | null })
				?.adminPermissions ?? null;
		if (
			!adminPermissionAllows(
				roleId,
				perms,
				AdminPageKeyEnum.MONITORING,
				'view'
			)
		) {
			activity = [];
			activityLoading = false;
			return;
		}
		activityLoading = true;
		try {
			const res = await fetch('/api/medora/admin/ops', {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) {
				activity = [];
				return;
			}
			const ops = (await res.json()) as AdminOpsPayload;
			activity = ops.activity.slice(0, 5);
		} catch {
			activity = [];
		} finally {
			activityLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		void loadSummary();
		void loadActivityTeaser();
	});
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-8">
	<section
		class="flex flex-col gap-4"
		aria-labelledby="admin-overview-heading"
	>
		<header class="flex min-w-0 flex-col gap-1">
			<h1
				id="admin-overview-heading"
				class="text-2xl font-bold text-primary"
			>
				{msg.admin_dashboard_title()}
			</h1>
			<p class="text-sm text-base-content/70">
				{msg.admin_overview_subtitle()}
			</p>
		</header>

		<div
			class="grid grid-cols-1 gap-3 sm:grid-cols-3"
			aria-label={msg.admin_overview_title()}
		>
			{#if canViewOwners}
				<a
					href={WebRoutesEnum.MEDORA_ADMIN_OWNERS}
					class="rounded-box border border-base-300 bg-base-100 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
				>
					<div class="flex items-center gap-3">
						<span class="rounded-box bg-primary/10 p-2 text-primary">
							<LucideUserCog className="size-5" />
						</span>
						<div>
							<p class="text-sm text-base-content/70">
								{msg.admin_overview_owners()}
							</p>
							<p class="text-2xl font-bold tabular-nums">
								{#if summaryLoading}
									<span class="loading loading-spinner loading-sm"></span>
								{:else}
									{summary?.owners ?? 0}
								{/if}
							</p>
						</div>
					</div>
				</a>
			{/if}
			{#if canViewHospitals}
				<a
					href={WebRoutesEnum.MEDORA_ADMIN_HOSPITALS}
					class="rounded-box border border-base-300 bg-base-100 p-4 transition-colors hover:border-secondary/40 hover:bg-secondary/5 cursor-pointer"
				>
					<div class="flex items-center gap-3">
						<span class="rounded-box bg-secondary/10 p-2 text-secondary">
							<LucideHouse className="size-5" />
						</span>
						<div>
							<p class="text-sm text-base-content/70">
								{msg.admin_overview_hospitals()}
							</p>
							<p class="text-2xl font-bold tabular-nums">
								{#if summaryLoading}
									<span class="loading loading-spinner loading-sm"></span>
								{:else}
									{summary?.hospitals ?? 0}
								{/if}
							</p>
						</div>
					</div>
				</a>
			{/if}
			{#if canViewStaff}
				<a
					href={WebRoutesEnum.MEDORA_ADMIN_STAFF}
					class="rounded-box border border-base-300 bg-base-100 p-4 transition-colors hover:border-accent/40 hover:bg-accent/5 cursor-pointer"
				>
					<div class="flex items-center gap-3">
						<span class="rounded-box bg-accent/10 p-2 text-accent">
							<LucideUsersRound className="size-5" />
						</span>
						<div>
							<p class="text-sm text-base-content/70">
								{msg.admin_overview_staff()}
							</p>
							<p class="text-2xl font-bold tabular-nums">
								{#if summaryLoading}
									<span class="loading loading-spinner loading-sm"></span>
								{:else}
									{summary?.staff ?? 0}
								{/if}
							</p>
						</div>
					</div>
				</a>
			{/if}
		</div>
	</section>

	{#if canViewMonitoring}
		<section
			class="flex flex-col gap-3"
			aria-labelledby="admin-overview-activity-heading"
		>
			<header class="flex flex-wrap items-center justify-between gap-2">
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						<span class="text-primary" aria-hidden="true">
							<LucideActivity className="size-4" />
						</span>
						<h2
							id="admin-overview-activity-heading"
							class="text-lg font-bold text-base-content"
						>
							{msg.admin_ops_activity_title()}
						</h2>
					</div>
					<p class="mt-0.5 text-sm text-base-content/60">
						{msg.admin_overview_activity_teaser()}
					</p>
				</div>
				<a
					href={WebRoutesEnum.MEDORA_ADMIN_MONITORING}
					class="btn btn-ghost btn-sm btn-primary cursor-pointer"
				>
					{msg.admin_overview_go_monitoring()}
				</a>
			</header>

			{#if activityLoading}
				<div class="flex min-h-24 items-center justify-center">
					<span class="loading loading-spinner loading-md text-primary"></span>
				</div>
			{:else if activity.length === 0}
				<p
					class="rounded-box border border-dashed border-base-300 px-3 py-6 text-center text-sm text-base-content/60"
				>
					{msg.admin_ops_activity_empty()}
				</p>
			{:else}
				<ul class="divide-y divide-base-300 rounded-box border border-base-300">
					{#each activity as item (item.id)}
						<li class="flex items-start justify-between gap-2 px-3 py-2.5">
							<div class="min-w-0">
								<p class="text-xs font-medium text-primary">
									{activityLabel(item.kind)}
								</p>
								<p class="truncate text-sm font-semibold text-base-content">
									{item.title}
								</p>
								{#if item.subtitle}
									<p class="truncate text-xs text-base-content/60">
										{item.subtitle}
									</p>
								{/if}
							</div>
							<time
								class="shrink-0 whitespace-nowrap text-xs text-base-content/55"
								datetime={item.occurredAt}
							>
								{formatShort(item.occurredAt)}
							</time>
						</li>
					{/each}
				</ul>
				<p class="text-end">
					<a
						href={WebRoutesEnum.MEDORA_ADMIN_MONITORING}
						class="link link-primary cursor-pointer text-sm"
					>
						{msg.admin_overview_activity_link()}
					</a>
				</p>
			{/if}
		</section>
	{/if}
</div>
