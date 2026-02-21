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

	let { children, data } = $props();

	const hospitalId = $derived(page.params.hospital_id ?? '');

	const fullPageData = await getPageWithRelations();
	setPageData(fullPageData);

	const uniqueModuleData = $derived(getUniqueModuleData());
	const pageData = $derived(getPageData());
	const isEmbed = $derived(page.url.searchParams.get('embed') === '1');
	const currentStaffId = $derived(data?.staff?.id ?? null);
	const currentStaffPhotoUrl = $derived(
		(data?.staff as { photoUrl?: string | null } | null)?.photoUrl ?? null
	);
</script>

<div class="my-app">
	{#if !isEmbed}
		<GPrivateHekaNavbar />
		<GPrivateHekaModuleBar
			hospitalId={hospitalId}
			moduleList={uniqueModuleData}
			pageList={pageData}
			staffId={currentStaffId}
			staffPhotoUrl={currentStaffPhotoUrl}
		/>
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
