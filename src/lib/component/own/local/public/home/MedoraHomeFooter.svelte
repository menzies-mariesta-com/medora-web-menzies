<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import MedoraBrandWordmark from '$lib/component/own/global/MedoraBrandWordmark.svelte';
	import { RoleEnum } from '$lib/model/enum/db-link';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;

	const isSystemAdmin = $derived(
		page.data.userRoleId === RoleEnum.SYSTEM_ADMIN
	);
	const hasAdminDashboardAccess = $derived(
		Boolean(
			(page.data as { hasAdminDashboardAccess?: boolean })
				?.hasAdminDashboardAccess
		) || isSystemAdmin
	);
</script>

<footer class="border-t border-[var(--medora-ink)]/10 px-4 py-12 sm:px-6">
	<div
		class="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between"
	>
		<div>
			<MedoraBrandWordmark className="text-xl" />
			<p class="mt-2 max-w-xs text-sm text-[var(--medora-ink)]/65">
				{m.home_footer_tagline()}
			</p>
		</div>
		<div class="flex flex-wrap gap-4 text-sm">
			<a
				href="{resolve('/')}#how-it-works"
				class="link link-hover cursor-pointer"
			>
				{m.common_how_it_works()}
			</a>
			<a
				href="{resolve('/')}#care-model"
				class="link link-hover cursor-pointer"
			>
				{m.common_care_model()}
			</a>
			<a
				href={resolve(WebRoutesEnum.PRICING)}
				class="link link-hover cursor-pointer"
			>
				{m.common_pricing()}
			</a>
			{#if hasAdminDashboardAccess}
				<a
					href={resolve(WebRoutesEnum.MEDORA_ADMIN)}
					class="link link-hover cursor-pointer"
				>
					{msg.common_admin_dashboard()}
				</a>
			{:else}
				<a
					href={resolve(WebRoutesEnum.LOGIN)}
					class="link link-hover cursor-pointer"
				>
					{m.common_sign_in()}
				</a>
			{/if}
		</div>
	</div>
	<p class="mx-auto mt-10 max-w-6xl text-xs text-[var(--medora-ink)]/55">
		{m.home_footer_copyright({ year: String(new Date().getFullYear()) })}
	</p>
</footer>
