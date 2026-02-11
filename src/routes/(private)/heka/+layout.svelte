<script lang="ts">
	import { page } from '$app/state';
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
	const isEmbed = $derived(page.url.searchParams.get('embed') === '1');
</script>

<div class="my-app">
	{#if !isEmbed}
		<GPrivateHekaNavbar />
		<GPrivateHekaModuleBar moduleList={uniqueModuleData} pageList={pageData} />
	{/if}
	<div class="my-main p-3" class:my-main-embed={isEmbed}>
		{@render children?.()}
	</div>
	{#if !isEmbed}
		<GPrivateHekaFooterBar />
	{/if}
</div>

<style>
	.my-main-embed {
		padding: 0.5rem;
	}
</style>
