<script>
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLink from '$lib/component/library/daisyui/link/DaisyUiLink.svelte';
	import DaisyUiNavbar from '$lib/component/library/daisyui/navbar/DaisyUiNavbar.svelte';
	import DaisyUiNavbarEnd from '$lib/component/library/daisyui/navbar/end/DaisyUiNavbarEnd.svelte';
	import DaisyUiNavbarStart from '$lib/component/library/daisyui/navbar/start/DaisyUiNavbarStart.svelte';
	import { authClient } from '$lib/auth-client';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';

	const routerUtil = new RouterUtil();
	const session = authClient.useSession();

	async function handleSignOut() {
		await authClient.signOut();
		routerUtil.goToRoute(WebRoutesEnum.DEFAULT);
	}
</script>

<DaisyUiNavbar>
	<DaisyUiNavbarStart>
		<DaisyUiLink className="" href={WebRoutesEnum.DEFAULT}>
			<img src={HekaLogo} alt="" class="w-42" />
		</DaisyUiLink>
		<!-- <DaisyUiButton
			onClick={() => routerUtil.goToRoute(WebRoutesEnum.DEFAULT)}
			className="my-ft-h3 d-btn-ghost"
		></DaisyUiButton> -->
	</DaisyUiNavbarStart>

	<DaisyUiNavbarEnd className="gap-3">
		{#if $session.data}
			<div class="flex items-center gap-2 my-ft-small">
				<span class="opacity-70">
					{$session.data.user.name ?? $session.data.user.email}
				</span>
			</div>
			<DaisyUiButton onClick={handleSignOut}>
				Log out
			</DaisyUiButton>
		{:else}
			<DaisyUiButton
				onClick={() => routerUtil.goToRoute(WebRoutesEnum.SIGNUP)}
			>
				SIGN UP
			</DaisyUiButton>
			<DaisyUiButton
				onClick={() => routerUtil.goToRoute(WebRoutesEnum.LOGIN)}
				className="d-btn-primary"
			>
				LOGIN
			</DaisyUiButton>
		{/if}
	</DaisyUiNavbarEnd>
</DaisyUiNavbar>
