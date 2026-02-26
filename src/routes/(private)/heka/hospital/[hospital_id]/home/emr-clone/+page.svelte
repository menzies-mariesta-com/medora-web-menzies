<script lang="ts">
	import { page } from '$app/state';
	import { hekaHospitalPageUrl, WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	const routerUtil = new RouterUtil();
	const lifeCycleUtil = new LifeCycleUtil();
	const hospitalId = $derived(page.params.hospital_id);

	lifeCycleUtil.onMount(() => {
		if (hospitalId) routerUtil.replaceRoute(hekaHospitalPageUrl(hospitalId, WebRoutesEnum.HEKA_HOME_EMR_CLONE_EMR));
	});
</script>
