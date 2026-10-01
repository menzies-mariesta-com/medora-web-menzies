<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { RoleEnum } from '$lib/model/enum/db-link';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';
	import CareHeroScene from './CareHeroScene.svelte';

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

<section
	class="relative overflow-hidden px-4 pt-28 pb-16 sm:px-6 sm:pt-32 sm:pb-24"
	aria-labelledby="hero-heading"
>
	<div
		class="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:gap-10"
	>
		<div class="relative z-10 max-w-xl">
			<p
				class="font-display text-primary text-lg font-semibold tracking-tight sm:text-xl"
			>
				{m.brand_menzies_mariesta()}
			</p>
			<h1
				id="hero-heading"
				class="mt-4 text-3xl leading-tight font-semibold text-[var(--medora-ink)] sm:text-4xl lg:text-[2.75rem]"
			>
				{m.home_hero_headline()}
			</h1>
			<p
				class="mt-4 max-w-md text-base leading-relaxed text-[var(--medora-ink)]/75 sm:text-lg"
			>
				{m.home_hero_body()}
			</p>
			<div class="mt-8 flex flex-wrap gap-3">
				{#if hasAdminDashboardAccess}
					<a
						href={resolve(WebRoutesEnum.MEDORA_ADMIN)}
						class="btn btn-primary cursor-pointer"
					>
						{msg.common_admin_dashboard()}
					</a>
				{:else}
					<a
						href={resolve(WebRoutesEnum.LOGIN)}
						class="btn btn-primary cursor-pointer"
					>
						{m.common_sign_in()}
					</a>
				{/if}
				<a href="#how-it-works" class="btn btn-outline cursor-pointer">
					{m.home_hero_cta_how()}
				</a>
			</div>
		</div>
		<div class="relative w-full min-w-0 lg:justify-self-stretch">
			<CareHeroScene />
		</div>
	</div>
</section>
