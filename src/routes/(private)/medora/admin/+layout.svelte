<script lang="ts">
	import AdminSidebar from '$lib/component/own/local/private/medora/admin/AdminSidebar.svelte';
	import LucideMenu from '$lib/component/own/library/lucide/LucideMenu.svelte';
	import AnimatedPageContent from '$lib/component/own/library/gsap/AnimatedPageContent.svelte';
	import { adminShellState } from '$lib/state/admin-shell.state.svelte';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';

	let { children, data } = $props();

	const msg = m as unknown as Record<string, (inputs?: object) => string>;

	const userName = $derived(
		(data?.user as { name?: string | null } | null)?.name ?? null
	);
	const userEmail = $derived(
		(data?.user as { email?: string | null } | null)?.email ?? null
	);

	const drawerId = 'medora-admin-drawer';
</script>

<div class="drawer lg:drawer-open h-dvh max-h-dvh overflow-hidden">
	<input
		id={drawerId}
		type="checkbox"
		class="drawer-toggle"
		bind:checked={adminShellState.drawerOpen}
	/>

	<div class="drawer-content flex min-h-0 min-w-0 flex-col bg-base-100">
		<header
			class="navbar min-h-12 shrink-0 gap-2 border-b border-ink-border bg-base-100 px-2 lg:hidden"
		>
			<div
				class="tooltip tooltip-right tooltip-primary"
				data-tip={msg.admin_open_menu()}
			>
				<label
					for={drawerId}
					class="btn btn-ghost btn-square btn-primary cursor-pointer drawer-button"
					aria-label={msg.admin_open_menu()}
				>
					<LucideMenu className="size-5" />
				</label>
			</div>
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-semibold text-primary">
					{msg.system_admin()}
				</p>
			</div>
		</header>

		<main
			id="admin-main-scroll"
			class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-5"
		>
			{#key page.url.pathname}
				<AnimatedPageContent type="fadeUp">
					{@render children?.()}
				</AnimatedPageContent>
			{/key}
		</main>
	</div>

	<div class="drawer-side z-40">
		<label
			for={drawerId}
			class="drawer-overlay cursor-pointer"
			aria-label={msg.admin_close_menu()}
		></label>
		<AdminSidebar {userName} {userEmail} />
	</div>
</div>
