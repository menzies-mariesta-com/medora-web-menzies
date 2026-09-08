<script lang="ts">
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	import { onMount } from 'svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import { authClient } from '$lib/auth/client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	const routerUtil = new RouterUtil();
	let sessionData = $state<{
		user: {
			name?: string | null;
			email: string;
		};
	} | null>(null);

	onMount(async () => {
		const { data } = await authClient.getSession();
		sessionData = data ?? null;
	});

	async function handleSignOut() {
		await authClient.signOut();
		routerUtil.goToRoute(WebRoutesEnum.DEFAULT);
	}
</script>

<div class="{washRecipes.navbar}">
	<div class="navbar-start">
		<WashButton
			onClick={() => routerUtil.goToRoute(WebRoutesEnum.DEFAULT)}
			className="my-ft-h3 btn-ghost font-[family-name:var(--font-display)]"
		>
			{m.menzies_medora()}
		</WashButton>
	</div>

	<div class="navbar-center">
		<a class="btn" href={WebRoutesEnum.ONBOARDING_MARKETPLACE}>
			{m.market_place()}
		</a>
	</div>

	<div class="navbar-end gap-3">
		{#if sessionData}
			<div class="my-ft-small flex items-center gap-2">
				<span class="opacity-70">
					{sessionData.user.name ?? sessionData.user.email}
				</span>
			</div>
			<WashButton onClick={handleSignOut}
				>{m.log_out()}</WashButton
			>
		{:else}
			<WashButton
				onClick={() => routerUtil.goToRoute(WebRoutesEnum.SIGNUP)}
			>
				{m.sign_up()}
			</WashButton>
			<WashButton
				onClick={() => routerUtil.goToRoute(WebRoutesEnum.LOGIN)}
				className="btn-primary"
			>
				{m.login()}
			</WashButton>
		{/if}
	</div>
</div>
