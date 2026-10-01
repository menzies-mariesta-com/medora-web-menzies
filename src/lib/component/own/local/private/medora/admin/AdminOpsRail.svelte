<script lang="ts">
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import type {
		AdminOpsActivityItem,
		AdminOpsPayload
	} from '$lib/model/type/medora/admin-ops.type';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import LucideActivity from '$lib/component/own/library/lucide/LucideActivity.svelte';
	import LucideDatabase from '$lib/component/own/library/lucide/LucideDatabase.svelte';
	import LucideHardDrive from '$lib/component/own/library/lucide/LucideHardDrive.svelte';
	import LucideRefreshCcw from '$lib/component/own/library/lucide/LucideRefreshCcw.svelte';
	import LucideClock from '$lib/component/own/library/lucide/LucideClock.svelte';
	import LucideUserCog from '$lib/component/own/library/lucide/LucideUserCog.svelte';
	import LucideHouse from '$lib/component/own/library/lucide/LucideHouse.svelte';
	import LucideUsersRound from '$lib/component/own/library/lucide/LucideUsersRound.svelte';
	import LucideShieldCheck from '$lib/component/own/library/lucide/LucideShieldCheck.svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		refreshKey = 0,
		layout = 'page'
	}: {
		/** Bump from parent after mutations. */
		refreshKey?: number;
		/** `page` = full-width monitoring; `rail` = compact column. */
		layout?: 'page' | 'rail';
	} = $props();

	const lifeCycleUtil = new LifeCycleUtil();
	const datetimeUtil = new DateTimeUtil();
	const msg = m as unknown as Record<string, (inputs?: object) => string>;

	const isPage = $derived(layout === 'page');

	let ops = $state<AdminOpsPayload | null>(null);
	let loading = $state(true);
	let refreshing = $state(false);
	let errorMessage = $state<string | null>(null);

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

	function formatBytes(bytes: number | null | undefined): string {
		if (bytes == null || Number.isNaN(bytes)) return '-';
		if (bytes < 1024) return `${bytes} B`;
		const units = ['KB', 'MB', 'GB', 'TB'];
		let n = bytes / 1024;
		let i = 0;
		while (n >= 1024 && i < units.length - 1) {
			n /= 1024;
			i += 1;
		}
		return `${n.toFixed(n >= 10 ? 0 : 1)} ${units[i]}`;
	}

	function noteText(key: string): string {
		const map: Record<string, () => string> = {
			size_from_pg: () => msg.admin_ops_db_note_size_from_pg(),
			quota_via_neon: () => msg.admin_ops_db_note_quota_via_neon(),
			live_counts: () => msg.admin_ops_db_note_live_counts(),
			connection_failed: () => msg.admin_ops_db_note_connection_failed()
		};
		return map[key]?.() ?? key;
	}

	async function loadOps(opts?: { silent?: boolean }) {
		const silent = opts?.silent === true;
		if (silent) refreshing = true;
		else loading = true;
		errorMessage = null;
		try {
			const res = await fetch('/api/medora/admin/ops', {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) {
				ops = null;
				errorMessage = msg.admin_ops_load_error();
				return;
			}
			ops = (await res.json()) as AdminOpsPayload;
		} catch {
			ops = null;
			errorMessage = msg.admin_ops_load_error();
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		void loadOps();
	});

	$effect(() => {
		const key = refreshKey;
		if (key > 0) void loadOps({ silent: true });
	});
</script>

<section
	class="flex min-h-0 w-full flex-col border-base-300 bg-base-100 {washRecipes.washPanel} rounded-box border {isPage
		? 'min-h-[28rem]'
		: 'h-full'}"
	aria-label={msg.admin_ops_aria()}
>
	<header
		class="flex shrink-0 items-start justify-between gap-2 border-b border-base-300 px-4 py-3 sm:px-5"
	>
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<span class="text-primary" aria-hidden="true">
					<LucideActivity className="size-4" />
				</span>
				<h2 class="text-base font-bold leading-tight text-base-content">
					{msg.admin_ops_title()}
				</h2>
			</div>
			<p class="mt-0.5 text-xs text-base-content/60 sm:text-sm">
				{msg.admin_ops_subtitle()}
			</p>
		</div>
		<div
			class="tooltip tooltip-left tooltip-secondary"
			data-tip={msg.admin_ops_refresh()}
		>
			<button
				type="button"
				class="btn btn-ghost btn-square btn-secondary btn-sm"
				class:cursor-pointer={!refreshing && !loading}
				class:cursor-not-allowed={refreshing || loading}
				class:btn-disabled={refreshing || loading}
				class:loading={refreshing}
				disabled={refreshing || loading}
				aria-busy={refreshing}
				aria-label={msg.admin_ops_refresh()}
				onclick={() => void loadOps({ silent: true })}
			>
				{#if !refreshing}
					<LucideRefreshCcw className="size-4" />
				{/if}
			</button>
		</div>
	</header>

	<div
		class="min-h-0 flex-1 space-y-6 overflow-y-auto p-3 sm:p-4 md:p-5 {isPage
			? 'lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6'
			: ''}"
	>
		{#if loading && !ops}
			<div
				class="flex min-h-40 items-center justify-center {isPage
					? 'lg:col-span-2'
					: ''}"
			>
				<span class="loading loading-spinner loading-md text-primary"></span>
			</div>
		{:else if errorMessage && !ops}
			<p
				class="rounded-box border border-error/30 bg-error/5 px-3 py-4 text-sm text-error {isPage
					? 'lg:col-span-2'
					: ''}"
			>
				{errorMessage}
			</p>
		{:else if ops}
			<!-- Usage -->
			<section
				class={isPage ? 'lg:col-span-2' : ''}
				aria-labelledby="admin-ops-usage-heading"
			>
				<h3
					id="admin-ops-usage-heading"
					class="mb-2 text-sm font-bold text-base-content"
				>
					{msg.admin_ops_usage_title()}
				</h3>
				<p class="mb-2 text-xs text-base-content/60">
					{msg.admin_ops_usage_subtitle()}
				</p>
				<div
					class="grid grid-cols-2 gap-2 {isPage
						? 'sm:grid-cols-3 lg:grid-cols-6'
						: ''}"
				>
					<div class="rounded-box border border-base-300 bg-base-100/80 p-2.5">
						<div class="flex items-center gap-1.5 text-xs text-base-content/60">
							<LucideClock className="size-3.5 shrink-0" />
							<span>{msg.admin_ops_usage_active_sessions()}</span>
						</div>
						<p class="mt-1 text-lg font-bold tabular-nums">
							{ops.usage.activeSessions}
						</p>
					</div>
					<div class="rounded-box border border-base-300 bg-base-100/80 p-2.5">
						<div class="flex items-center gap-1.5 text-xs text-base-content/60">
							<LucideActivity className="size-3.5 shrink-0" />
							<span>{msg.admin_ops_usage_logins_24h()}</span>
						</div>
						<p class="mt-1 text-lg font-bold tabular-nums">
							{ops.usage.sessionsCreatedLast24h}
						</p>
					</div>
					<div class="rounded-box border border-base-300 bg-base-100/80 p-2.5">
						<div class="flex items-center gap-1.5 text-xs text-base-content/60">
							<LucideUserCog className="size-3.5 shrink-0" />
							<span>{msg.admin_ops_usage_owners_7d()}</span>
						</div>
						<p class="mt-1 text-lg font-bold tabular-nums">
							{ops.usage.ownersCreatedLast7d}
						</p>
					</div>
					<div class="rounded-box border border-base-300 bg-base-100/80 p-2.5">
						<div class="flex items-center gap-1.5 text-xs text-base-content/60">
							<LucideHouse className="size-3.5 shrink-0" />
							<span>{msg.admin_ops_usage_hospitals_7d()}</span>
						</div>
						<p class="mt-1 text-lg font-bold tabular-nums">
							{ops.usage.hospitalsCreatedLast7d}
						</p>
					</div>
					<div class="rounded-box border border-base-300 bg-base-100/80 p-2.5">
						<div class="flex items-center gap-1.5 text-xs text-base-content/60">
							<LucideUsersRound className="size-3.5 shrink-0" />
							<span>{msg.admin_ops_usage_staff_7d()}</span>
						</div>
						<p class="mt-1 text-lg font-bold tabular-nums">
							{ops.usage.staffCreatedLast7d}
						</p>
					</div>
					<div class="rounded-box border border-base-300 bg-base-100/80 p-2.5">
						<div class="flex items-center gap-1.5 text-xs text-base-content/60">
							<LucideShieldCheck className="size-3.5 shrink-0" />
							<span>{msg.admin_ops_usage_2fa()}</span>
						</div>
						<p class="mt-1 text-lg font-bold tabular-nums">
							{ops.usage.twoFactorEnabledUsers}
						</p>
					</div>
				</div>
			</section>

			<!-- Activity feed -->
			<section aria-labelledby="admin-ops-activity-heading">
				<h3
					id="admin-ops-activity-heading"
					class="mb-2 text-sm font-bold text-base-content"
				>
					{msg.admin_ops_activity_title()}
				</h3>
				<p class="mb-2 text-xs text-base-content/60">
					{msg.admin_ops_activity_subtitle()}
				</p>
				{#if ops.activity.length === 0}
					<p
						class="rounded-box border border-dashed border-base-300 px-3 py-6 text-center text-sm text-base-content/60"
					>
						{msg.admin_ops_activity_empty()}
					</p>
				{:else}
					<ul class="divide-y divide-base-300 rounded-box border border-base-300">
						{#each ops.activity as item (item.id)}
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
				{/if}
			</section>

			<!-- DB health -->
			<section aria-labelledby="admin-ops-db-heading">
				<div class="mb-2 flex items-center gap-2">
					<span class="text-secondary" aria-hidden="true">
						<LucideDatabase className="size-4" />
					</span>
					<h3
						id="admin-ops-db-heading"
						class="text-sm font-bold text-base-content"
					>
						{msg.admin_ops_db_title()}
					</h3>
				</div>
				<p class="mb-2 text-xs text-base-content/60">
					{msg.admin_ops_db_subtitle()}
				</p>

				<div
					class="mb-2 flex flex-wrap items-center gap-2 rounded-box border border-base-300 px-3 py-2"
				>
					<span
						class="badge badge-sm {ops.db.connectionOk
							? 'badge-success'
							: 'badge-error'}"
					>
						{ops.db.connectionOk
							? msg.admin_ops_db_ok()
							: msg.admin_ops_db_error()}
					</span>
					{#if ops.db.latencyMs != null}
						<span class="text-xs text-base-content/60">
							{msg.admin_ops_db_latency({ ms: String(ops.db.latencyMs) })}
						</span>
					{/if}
					<span class="text-xs text-base-content/55">
						{msg.admin_ops_db_checked({
							time: formatShort(ops.db.checkedAt)
						})}
					</span>
				</div>

				<div class="mb-2 grid grid-cols-1 gap-2">
					<div class="rounded-box border border-base-300 p-2.5">
						<div class="flex items-center gap-1.5 text-xs text-base-content/60">
							<LucideHardDrive className="size-3.5" />
							<span>{msg.admin_ops_db_size()}</span>
						</div>
						<p class="mt-1 text-base font-bold tabular-nums">
							{ops.db.sizePretty ?? formatBytes(ops.db.sizeBytes)}
						</p>
						<p class="mt-0.5 text-xs text-base-content/55">
							{msg.admin_ops_db_quota_note()}
						</p>
					</div>
					{#if ops.db.databaseName}
						<p class="px-0.5 text-xs text-base-content/60">
							{msg.admin_ops_db_name({ name: ops.db.databaseName })}
						</p>
					{/if}
					{#if ops.db.activeConnections != null}
						<p class="px-0.5 text-xs text-base-content/60">
							{msg.admin_ops_db_connections({
								active: String(ops.db.activeConnections),
								max:
									ops.db.maxConnections != null
										? String(ops.db.maxConnections)
										: '-'
							})}
						</p>
					{/if}
				</div>

				{#if ops.db.tableCounts.length > 0}
					<div
						class="overflow-x-auto overflow-hidden rounded-box border border-base-300 {washRecipes.tableChrome}"
					>
						<table
							class="table table-zebra table-sm [&_tbody_tr]:hover:bg-primary/40"
						>
							<thead>
								<tr>
									<th>{msg.admin_ops_db_table()}</th>
									<th class="text-end">{msg.admin_ops_db_rows()}</th>
								</tr>
							</thead>
							<tbody>
								{#each ops.db.tableCounts as row (row.name)}
									<tr>
										<td class="font-mono text-xs">{row.name}</td>
										<td class="text-end tabular-nums">{row.rows}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

				{#if ops.db.notes.length > 0}
					<ul class="mt-2 list-disc space-y-1 pl-4 text-xs text-base-content/55">
						{#each ops.db.notes as note, i (i)}
							<li>{noteText(note)}</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	</div>
</section>
