<script>
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const routerUtil = new RouterUtil();
</script>

<DaisyUiButton
	onClick={() => routerUtil.goToRoute(WebRoutesEnum.LOGIN)}
>
	Login
</DaisyUiButton>
