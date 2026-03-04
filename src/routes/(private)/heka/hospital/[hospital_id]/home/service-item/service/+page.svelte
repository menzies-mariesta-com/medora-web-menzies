<script lang="ts">
	import { page } from '$app/state';
	import {
		hekaHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import { getSubPages } from '$lib/state/page.state.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id);

	// Fallback when server didn't redirect (e.g. client nav): redirect to first sub-page,
	// or to the \"Create\" page as a safe default.
	lifeCycleUtil.onMount(() => {
		const first = getSubPages()[0];
		const targetPageUrl =
			first?.pageUrl ?? WebRoutesEnum.HEKA_HOME_SERVICE_ITEM_CREATE;
		if (targetPageUrl && hospitalId) {
			routerUtil.replaceRoute(
				hekaHospitalPageUrl(hospitalId, targetPageUrl)
			);
		}
	});
</script>
