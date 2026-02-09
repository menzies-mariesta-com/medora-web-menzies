<script lang="ts">
	import GPrivateHekaFooterBar from '$lib/component/global/private/heka/GPrivateHekaFooterBar.svelte';
	import GPrivateHekaModuleBar from '$lib/component/global/private/heka/GPrivateHekaModuleBar.svelte';
	import GPrivateHekaNavbar from '$lib/component/global/private/heka/GPrivateHekaNavbar.svelte';
	import { getPageWithRelations } from '$lib/remote/table/information-table/page.remote';
	import {
		setPageData,
		getUniqueModuleData,
		getPageData
	} from '$lib/state/page.state.svelte';

	let { children } = $props();

	const fullPageData = await getPageWithRelations();
	setPageData(fullPageData);

	const uniqueModuleData = $derived(getUniqueModuleData());
	const pageData = $derived(getPageData());
</script>

<div class="my-app">
	<GPrivateHekaNavbar />
	<GPrivateHekaModuleBar moduleList={uniqueModuleData} pageList={pageData} />
	<div class="my-main p-3">
		{@render children?.()}
	</div>
	<GPrivateHekaFooterBar />
</div>
