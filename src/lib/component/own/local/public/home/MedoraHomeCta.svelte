<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
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

<section class="px-4 py-20 sm:px-6" aria-labelledby="cta-heading">
	<div class="mx-auto max-w-3xl text-center">
		<h2
			id="cta-heading"
			class="text-3xl font-semibold text-[var(--medora-ink)] sm:text-4xl"
		>
			{m.home_cta_heading()}
		</h2>
		<p class="mx-auto mt-3 max-w-md text-[var(--medora-ink)]/70">
			{m.home_cta_body()}
		</p>
		<div class="mt-8 flex flex-wrap justify-center gap-3">
			{#if hasAdminDashboardAccess}
				<a
					href={resolve(WebRoutesEnum.MEDORA_ADMIN)}
					class="btn btn-primary btn-lg cursor-pointer"
				>
					{msg.common_admin_dashboard()}
				</a>
			{:else}
				<a
					href={resolve(WebRoutesEnum.LOGIN)}
					class="btn btn-primary btn-lg cursor-pointer"
				>
					{m.common_sign_in()}
				</a>
			{/if}
			<a href="#care-model" class="btn btn-ghost btn-lg cursor-pointer">
				{m.home_cta_review_model()}
			</a>
		</div>
	</div>
</section>
