<script lang="ts">
	import { page } from '$app/state';
	import GPrivateHekaFooterBar from '$lib/component/global/private/heka/GPrivateHekaFooterBar.svelte';
	import GPrivateHekaModuleBar from '$lib/component/global/private/heka/GPrivateHekaModuleBar.svelte';
	import GPrivateHekaNavbar from '$lib/component/global/private/heka/GPrivateHekaNavbar.svelte';
	import AnimatedPageContent from '$lib/component/library/gsap/AnimatedPageContent.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import {
		setPageData,
		getUniqueModuleData,
		getPageData,
		pathnameForPageMatch
	} from '$lib/state/page.state.svelte';

	let { children, data } = $props();

	const hospitalId = $derived(page.params.hospital_id ?? '');

	// Page list comes from server: all pages for OWNER/SYSTEM_ADMIN, filtered by user group for STAFF
	$effect(() => {
		if (data.pageData?.length !== undefined)
			setPageData(data.pageData);
	});

	const uniqueModuleData = $derived(getUniqueModuleData());
	const pageData = $derived(getPageData());
	const isEmbed = $derived(
		page.url.searchParams.get('embed') === '1'
	);
	const isInEmrCloneEmr = $derived(
		pathnameForPageMatch().startsWith(
			WebRoutesEnum.HEKA_HOME_NURSING_WORKBENCH_EMR
		) ||
		pathnameForPageMatch().startsWith(
			WebRoutesEnum.HEKA_HOME_CPOE
		) ||
		pathnameForPageMatch().startsWith(
			WebRoutesEnum.HEKA_HOME_OBSERVATION_EMR
		)
	);
	let emrNavbarOpen = $state(false);
	let prevInEmrCloneEmr = $state(false);
	$effect(() => {
		if (isInEmrCloneEmr && !prevInEmrCloneEmr) emrNavbarOpen = false;
		prevInEmrCloneEmr = isInEmrCloneEmr;
	});
	const currentStaffId = $derived(data?.staff?.id ?? null);
	const currentStaffPhotoUrl = $derived(
		(data?.staff as { photoUrl?: string | null } | null)?.photoUrl ??
			null
	);
</script>

<div class="my-app">
	{#if !isEmbed}
		<GPrivateHekaNavbar />
		{#key `${hospitalId}-${(data?.staffUserGroupsForNav ?? []).map((g) => g.id).join(',')}-${(data?.staffBranchesForNav ?? []).map((b) => b.id).join(',')}`}
			<GPrivateHekaModuleBar
				{hospitalId}
				hospitalName={data?.currentHospitalName ?? null}
				moduleList={uniqueModuleData}
				pageList={pageData}
				staffId={currentStaffId}
				staffPhotoUrl={currentStaffPhotoUrl}
				userRoleId={data?.userRoleId ?? null}
				staffUserGroupsForNav={data?.staffUserGroupsForNav ?? []}
				selectedUserGroupId={data?.selectedUserGroupId ?? null}
				staffBranchesForNav={data?.staffBranchesForNav ?? []}
				selectedBranchId={data?.selectedBranchId ?? null}
				navbarVisible={isInEmrCloneEmr ? emrNavbarOpen : undefined}
				onToggleNavbar={isInEmrCloneEmr
					? () => (emrNavbarOpen = !emrNavbarOpen)
					: undefined}
			/>
		{/key}
	{/if}
	<div class="my-main p-3" class:my-main-embed={isEmbed}>
		{#key page.url.pathname}
			<AnimatedPageContent>
				{@render children?.()}
			</AnimatedPageContent>
		{/key}
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
