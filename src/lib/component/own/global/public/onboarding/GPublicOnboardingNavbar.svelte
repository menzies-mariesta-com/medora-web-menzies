<script lang="ts">
	import { onMount } from 'svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiNavbar from '$lib/component/daisyui/navbar/DaisyUiNavbar.svelte';
	import DaisyUiNavbarEnd from '$lib/component/daisyui/navbar/end/DaisyUiNavbarEnd.svelte';
	import DaisyUiNavbarStart from '$lib/component/daisyui/navbar/start/DaisyUiNavbarStart.svelte';
	import { authClient } from '$lib/auth/client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import DaisyUiNavbarCenter from '$lib/component/daisyui/navbar/center/DaisyUiNavbarCenter.svelte';
	import DaisyUiLink from '$lib/component/daisyui/link/DaisyUiLink.svelte';

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

<DaisyUiNavbar>
	<DaisyUiNavbarStart>
		<DaisyUiButton
			onClick={() => routerUtil.goToRoute(WebRoutesEnum.DEFAULT)}
			className="my-ft-h3 d-btn-ghost"
		>
			{m.heka()}
		</DaisyUiButton>
	</DaisyUiNavbarStart>

	<DaisyUiNavbarCenter>
		<DaisyUiLink
			href={WebRoutesEnum.ONBOARDING_MARKETPLACE}
			className="d-btn"
		>
			{m.market_place()}
		</DaisyUiLink>
	</DaisyUiNavbarCenter>

	<DaisyUiNavbarEnd className="gap-3">
		{#if sessionData}
			<div class="my-ft-small flex items-center gap-2">
				<span class="opacity-70">
					{sessionData.user.name ?? sessionData.user.email}
				</span>
			</div>
			<DaisyUiButton onClick={handleSignOut}
				>{m.log_out()}</DaisyUiButton
			>
		{:else}
			<DaisyUiButton
				onClick={() => routerUtil.goToRoute(WebRoutesEnum.SIGNUP)}
			>
				{m.sign_up()}
			</DaisyUiButton>
			<DaisyUiButton
				onClick={() => routerUtil.goToRoute(WebRoutesEnum.LOGIN)}
				className="d-btn-primary"
			>
				{m.login()}
			</DaisyUiButton>
		{/if}
	</DaisyUiNavbarEnd>
</DaisyUiNavbar>
