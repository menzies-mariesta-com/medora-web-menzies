<script lang="ts">
	import GPrivateHekaFooterBar from '$lib/component/global/private/heka/GPrivateHekaFooterBar.svelte';
	import GPrivateHekaModuleBar from '$lib/component/global/private/heka/GPrivateHekaModuleBar.svelte';
	import GPrivateHekaNavbar from '$lib/component/global/private/heka/GPrivateHekaNavbar.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { getPageWithRelations } from '$lib/remote/table/information-table/page.remote';

	let { children } = $props();

	const lifeCycleUtil = new LifeCycleUtil();
	const routerUtil = new RouterUtil();

	lifeCycleUtil.onMount(() => {
		routerUtil.goToRoute(WebRoutesEnum.HEKA_HOME);
	});

	// ignore typing, just use `any[]`
	const fullPageData = (await getPageWithRelations()) as any[];

	// unique module objects by module.id
	const uniqueModuleData = Array.from(
		new Map(
			fullPageData
				.filter((p) => p.module) // keep only items that have module
				.map((p) => [p.module.id, p.module])
		).values()
	);

	// plain page objects (without module/status)
	const pageData = fullPageData.map(
		({ module, status, ...page }) => page
	);

	// page array with nested children (based on parentId)
	function buildPageTree(
		pages: any[],
		parentId: number | null = null
	) {
		return pages
			.filter((p) => p.parentId === parentId)
			.map((p) => ({
				...p,
				children: buildPageTree(pages, p.id)
			}));
	}

	const pageTree = buildPageTree(pageData);
</script>

<div class="my-app">
	<GPrivateHekaNavbar />
	<GPrivateHekaModuleBar
		moduleList={uniqueModuleData}
		pageList={pageData}
	/>
	<div class="my-main p-3">
		{@render children?.()}
	</div>
	<GPrivateHekaFooterBar />
</div>
