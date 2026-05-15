<script lang="ts">
	import { page } from '$app/state';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { getSubPages } from '$lib/state/page.state.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id);

	// Fallback when server didn't redirect (e.g. client nav): go to first report tab
	lifeCycleUtil.onMount(() => {
		const first = getSubPages()[0];
		if (first?.pageUrl && hospitalId)
			routerUtil.replaceRoute(
				hekaHospitalPageUrl(hospitalId, first.pageUrl)
			);
	});
</script>
