<script lang="ts">
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { getSubPages } from '$lib/state/page.state.svelte';

	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();

	// Fallback when server didn't redirect (e.g. client nav): redirect to first sub-page
	lifeCycleUtil.onMount(() => {
		const first = getSubPages()[0];
		if (first?.pageUrl) routerUtil.replaceRoute(first.pageUrl);
	});
</script>

<h1>Staff</h1>