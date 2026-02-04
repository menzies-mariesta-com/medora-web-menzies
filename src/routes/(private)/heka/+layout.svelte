<script lang="ts">
	import GPrivateHekaFooterBar from '$lib/component/global/private/heka/GPrivateHekaFooterBar.svelte';
	import GPrivateHekaModuleBar from '$lib/component/global/private/heka/GPrivateHekaModuleBar.svelte';
	import GPrivateHekaNavbar from '$lib/component/global/private/heka/GPrivateHekaNavbar.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	let { children } = $props();

	const lifeCycleUtil = new LifeCycleUtil();
	const routerUtil = new RouterUtil();

	lifeCycleUtil.onMount(() => {
		routerUtil.goToRoute(WebRoutesEnum.HEKA_HOME);
	});
</script>

<div class="my-app">
	<GPrivateHekaNavbar />
	<GPrivateHekaModuleBar />
	<div class="my-main p-3">
		{@render children?.()}
	</div>
	<GPrivateHekaFooterBar />
</div>
