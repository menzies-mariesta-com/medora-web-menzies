<script lang="ts">
	import GPrivateHekaFooterBar from '$lib/component/global/private/heka/GPrivateHekaFooterBar.svelte';
	import GPrivateHekaModuleBar from '$lib/component/global/private/heka/GPrivateHekaModuleBar.svelte';
	import GPrivateHekaNavbar from '$lib/component/global/private/heka/GPrivateHekaNavbar.svelte';
	import { getPageWithRelations } from '$lib/remote/table/information-table/page.remote';

	let { children } = $props();

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
	): any {
		return pages
			.filter((p) => p.parentId === parentId)
			.map((p: any) => ({
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
