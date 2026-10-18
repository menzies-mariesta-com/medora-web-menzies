<script lang="ts">
	import MedoraBrandWordmark from '$lib/component/own/global/MedoraBrandWordmark.svelte';
	import LucideActivity from '$lib/component/own/library/lucide/LucideActivity.svelte';
	import LucideAppWindow from '$lib/component/own/library/lucide/LucideAppWindow.svelte';
	import LucideBookMarked from '$lib/component/own/library/lucide/LucideBookMarked.svelte';
	import LucideHouse from '$lib/component/own/library/lucide/LucideHouse.svelte';
	import LucideLogOut from '$lib/component/own/library/lucide/LucideLogOut.svelte';
	import LucideUserCog from '$lib/component/own/library/lucide/LucideUserCog.svelte';
	import LucideUsers from '$lib/component/own/library/lucide/LucideUsers.svelte';
	import LucideUsersRound from '$lib/component/own/library/lucide/LucideUsersRound.svelte';
	import { authClient } from '$lib/auth/client';
	import { AdminPageKeyEnum } from '$lib/model/enum/db-link';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { closeAdminDrawer } from '$lib/state/admin-shell.state.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { adminPermissionAllows } from '$lib/util/admin-permission.util';
	import type { AdminPagePermissionFlags } from '$lib/model/type/medora/admin-team.type';
	import { page } from '$app/state';
	import { paraglideMsg } from '$lib/util/paraglide-msg.util';

	let {
		userName = null,
		userEmail = null
	}: {
		userName?: string | null;
		userEmail?: string | null;
	} = $props();

	const routerUtil = new RouterUtil();

	let signingOut = $state(false);

	const displayName = $derived(
		(userName?.trim() ||
			userEmail?.trim() ||
			paraglideMsg('system_admin', 'System admin')) as string
	);

	const userRoleId = $derived(
		(page.data as { userRoleId?: number | null })?.userRoleId ?? null
	);
	const adminPermissions = $derived(
		(page.data as { adminPermissions?: AdminPagePermissionFlags[] | null })
			?.adminPermissions ?? null
	);

	const allNavItems: {
		href: string;
		pageKey: AdminPageKeyEnum;
		label: () => string;
		icon: typeof LucideAppWindow;
		match: (pathname: string) => boolean;
	}[] = [
		{
			href: WebRoutesEnum.MEDORA_ADMIN,
			pageKey: AdminPageKeyEnum.OVERVIEW,
			label: () => paraglideMsg('admin_overview_title', 'Overview'),
			icon: LucideAppWindow,
			match: (pathname) => pathname === WebRoutesEnum.MEDORA_ADMIN
		},
		{
			href: WebRoutesEnum.MEDORA_ADMIN_OWNERS,
			pageKey: AdminPageKeyEnum.OWNERS,
			label: () => paraglideMsg('admin_overview_owners', 'Owners'),
			icon: LucideUserCog,
			match: (pathname) =>
				pathname.startsWith(WebRoutesEnum.MEDORA_ADMIN_OWNERS)
		},
		{
			href: WebRoutesEnum.MEDORA_ADMIN_HOSPITALS,
			pageKey: AdminPageKeyEnum.HOSPITALS,
			label: () => paraglideMsg('admin_overview_hospitals', 'Hospitals'),
			icon: LucideHouse,
			match: (pathname) =>
				pathname.startsWith(WebRoutesEnum.MEDORA_ADMIN_HOSPITALS)
		},
		{
			href: WebRoutesEnum.MEDORA_ADMIN_STAFF,
			pageKey: AdminPageKeyEnum.STAFF,
			label: () => paraglideMsg('admin_overview_staff', 'Staff'),
			icon: LucideUsersRound,
			match: (pathname) =>
				pathname.startsWith(WebRoutesEnum.MEDORA_ADMIN_STAFF)
		},
		{
			href: WebRoutesEnum.MEDORA_ADMIN_MONITORING,
			pageKey: AdminPageKeyEnum.MONITORING,
			label: () => paraglideMsg('admin_nav_monitoring', 'Monitoring'),
			icon: LucideActivity,
			match: (pathname) =>
				pathname.startsWith(WebRoutesEnum.MEDORA_ADMIN_MONITORING)
		},
		{
			href: WebRoutesEnum.MEDORA_ADMIN_ICD,
			pageKey: AdminPageKeyEnum.ICD,
			label: () => paraglideMsg('admin_nav_icd', 'ICD codes'),
			icon: LucideBookMarked,
			match: (pathname) =>
				pathname.startsWith(WebRoutesEnum.MEDORA_ADMIN_ICD)
		},
		{
			href: WebRoutesEnum.MEDORA_ADMIN_TEAM,
			pageKey: AdminPageKeyEnum.TEAM,
			label: () => paraglideMsg('admin_nav_team', 'Team'),
			icon: LucideUsers,
			match: (pathname) =>
				pathname.startsWith(WebRoutesEnum.MEDORA_ADMIN_TEAM)
		}
	];

	const navItems = $derived(
		allNavItems.filter((item) =>
			adminPermissionAllows(
				userRoleId,
				adminPermissions,
				item.pageKey,
				'view'
			)
		)
	);

	async function handleSignOut() {
		if (signingOut) return;
		signingOut = true;
		try {
			await authClient.signOut();
			routerUtil.goToRoute(WebRoutesEnum.DEFAULT);
		} finally {
			signingOut = false;
		}
	}

	function onNavClick() {
		closeAdminDrawer();
	}
</script>

<aside
	class="flex min-h-full h-full w-72 flex-col border-r border-ink-border bg-base-200"
	aria-label={paraglideMsg('admin_nav_aria', 'Admin navigation')}
>
	<div class="shrink-0 border-b border-ink-border px-4 py-4">
		<MedoraBrandWordmark
			href={WebRoutesEnum.MEDORA_ADMIN}
			className="text-base"
		/>
		<p class="mt-1 text-xs font-medium uppercase tracking-wide text-base-content/50">
			{paraglideMsg('system_admin', 'System admin')}
		</p>
	</div>

	<nav class="min-h-0 flex-1 overflow-y-auto px-2 py-3">
		<ul class="menu menu-md w-full gap-0.5 p-0">
			{#each navItems as item (item.href)}
				{@const Icon = item.icon}
				{@const active = item.match(page.url.pathname)}
				<li>
					<a
						href={item.href}
						class="cursor-pointer"
						class:menu-active={active}
						class:menu-wash-active={active}
						aria-current={active ? 'page' : undefined}
						onclick={onNavClick}
					>
						<Icon className="size-4 shrink-0" />
						{item.label()}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="shrink-0 space-y-2 border-t border-ink-border p-3">
		<div class="rounded-box bg-base-100/70 px-3 py-2">
			<p class="truncate text-sm font-medium text-base-content">
				{displayName}
			</p>
			{#if userEmail && userName?.trim()}
				<p class="truncate text-xs text-base-content/60">
					{userEmail}
				</p>
			{/if}
		</div>

		<button
			type="button"
			class="btn btn-ghost btn-sm btn-error w-full justify-start"
			class:cursor-pointer={!signingOut}
			class:cursor-not-allowed={signingOut}
			class:btn-disabled={signingOut}
			class:loading={signingOut}
			disabled={signingOut}
			aria-busy={signingOut}
			onclick={handleSignOut}
		>
			{#if !signingOut}
				<LucideLogOut className="size-4 shrink-0" />
			{/if}
			{paraglideMsg('log_out', 'Log out')}
		</button>
	</div>
</aside>
