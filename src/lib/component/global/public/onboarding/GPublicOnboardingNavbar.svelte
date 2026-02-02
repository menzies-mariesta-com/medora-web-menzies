<script>
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiNavbar from '$lib/component/library/daisyui/navbar/DaisyUiNavbar.svelte';
	import DaisyUiNavbarEnd from '$lib/component/library/daisyui/navbar/end/DaisyUiNavbarEnd.svelte';
	import DaisyUiNavbarStart from '$lib/component/library/daisyui/navbar/start/DaisyUiNavbarStart.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { m } from '$lib/paraglide/messages';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const routerUtil = new RouterUtil();
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
	

	<DaisyUiNavbarEnd className="gap-3">
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
	</DaisyUiNavbarEnd>
</DaisyUiNavbar>
