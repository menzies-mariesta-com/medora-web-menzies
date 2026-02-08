<script lang="ts">
	import GPrivateHekaFooterBar from '$lib/component/global/private/heka/GPrivateHekaFooterBar.svelte';
	import GPrivateHekaModuleBar from '$lib/component/global/private/heka/GPrivateHekaModuleBar.svelte';
	import GPrivateHekaNavbar from '$lib/component/global/private/heka/GPrivateHekaNavbar.svelte';
	import {
		getPageWithRelations,
		type PageWithRelations,
	} from '$lib/remote/table/information-table/page.remote';
	import type { PageSchema } from '$lib/server/db/schema-type';

	let { children } = $props();

	const fullPageData: PageWithRelations[] = await getPageWithRelations();

	// unique module objects by module.id
	const uniqueModuleData = Array.from(
		new Map(
			fullPageData
				.filter((p): p is PageWithRelations & { module: NonNullable<PageWithRelations['module']> } =>
					p.module != null
				)
				.map((p) => [p.module.id, p.module])
		).values()
	);

	// plain page objects (without module/status)
	const pageData: PageSchema[] = fullPageData.map(
		({ module: _module, status: _status, ...page }) => page
	);

	// page array with nested children (based on parentId)
	type PageTreeItem = PageSchema & { children: PageTreeItem[] };

	function buildPageTree(
		pages: PageSchema[],
		parentId: number | null = null
	): PageTreeItem[] {
		return pages
			.filter((p) => p.parentId === parentId)
			.map((p) => ({
				...p,
				children: buildPageTree(pages, p.id),
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
