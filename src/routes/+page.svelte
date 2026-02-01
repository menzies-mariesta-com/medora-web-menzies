<script lang="ts">
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const routerUtil = new RouterUtil();

	lifeCycleUtil.onMount(() => {
		routerUtil.goToRoute(WebRoutesEnum.ONBOARDING);
	});
</script>
