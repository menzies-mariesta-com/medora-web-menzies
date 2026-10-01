<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import MedoraBrandWordmark from '$lib/component/own/global/MedoraBrandWordmark.svelte';
	import { authClient } from '$lib/auth/client';
	import { RoleEnum } from '$lib/model/enum/db-link';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const routerUtil = new RouterUtil();
	const msg = m as Record<string, (inputs?: object) => string>;

	let solid = $state(false);
	let signingOut = $state(false);

	const user = $derived(page.data.user ?? null);
	const userRoleId = $derived(page.data.userRoleId ?? null);
	const isSystemAdmin = $derived(userRoleId === RoleEnum.SYSTEM_ADMIN);
	const displayName = $derived(
		user ? (user.name?.trim() || user.email || '') : ''
	);

	onMount(() => {
		const onScroll = () => {
			solid = window.scrollY > 24;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	async function handleSignOut() {
		if (signingOut) return;
		signingOut = true;
		try {
			await authClient.signOut();
			await invalidateAll();
			routerUtil.goToRoute(WebRoutesEnum.DEFAULT);
		} finally {
			signingOut = false;
		}
	}
</script>

<header
	class="fixed inset-x-0 top-0 z-50 transition-[background,box-shadow,backdrop-filter] duration-300 {solid
		? 'bg-base-100/90 shadow-sm backdrop-blur-md'
		: 'bg-transparent'}"
>
	<div
		class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
	>
		<MedoraBrandWordmark className="text-xl" />
		<nav class="flex flex-wrap items-center justify-end gap-1 sm:gap-3">
			<a
				href="{resolve('/')}#how-it-works"
				class="btn btn-ghost btn-sm hidden cursor-pointer sm:inline-flex"
			>
				{m.common_how_it_works()}
			</a>
			<a
				href="{resolve('/')}#care-model"
				class="btn btn-ghost btn-sm hidden cursor-pointer md:inline-flex"
			>
				{m.common_care_model()}
			</a>
			<a
				href={resolve(WebRoutesEnum.PRICING)}
				class="btn btn-ghost btn-sm cursor-pointer"
			>
				{m.common_pricing()}
			</a>
			{#if user}
				{#if !isSystemAdmin && displayName}
					<span class="hidden text-sm opacity-70 sm:inline">
						{displayName}
					</span>
				{/if}
				{#if isSystemAdmin}
					<a
						href={resolve(WebRoutesEnum.MEDORA_ADMIN)}
						class="btn btn-primary btn-sm cursor-pointer"
					>
						{msg.common_admin_dashboard()}
					</a>
				{:else}
					<a
						href={resolve(WebRoutesEnum.MEDORA_HOSPITAL)}
						class="btn btn-primary btn-sm cursor-pointer"
					>
						{m.common_open_hospitals()}
					</a>
				{/if}
				<button
					type="button"
					class="btn btn-ghost btn-sm cursor-pointer"
					class:cursor-not-allowed={signingOut}
					class:btn-disabled={signingOut}
					class:loading={signingOut}
					disabled={signingOut}
					aria-busy={signingOut}
					onclick={handleSignOut}
				>
					{m.log_out()}
				</button>
			{:else}
				<a
					href={resolve(WebRoutesEnum.LOGIN)}
					class="btn btn-primary btn-sm cursor-pointer"
				>
					{m.common_sign_in()}
				</a>
			{/if}
		</nav>
	</div>
</header>
