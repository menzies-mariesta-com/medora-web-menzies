<script lang="ts">
	import { page } from '$app/state';
	import { medoraHospitalPageUrl, WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { getSubPagesForPageUrl } from '$lib/state/page.state.svelte';

	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id);

	// Fallback when server didn't redirect (e.g. client nav): redirect to first sub-page
	lifeCycleUtil.onMount(() => {
		const first = getSubPagesForPageUrl(
			WebRoutesEnum.MEDORA_HOME_CONSULTATION_CPOE_REFER
		)[0];
		if (first?.pageUrl && hospitalId)
			routerUtil.replaceRoute(
				medoraHospitalPageUrl(hospitalId, first.pageUrl)
			);
	});
</script>
